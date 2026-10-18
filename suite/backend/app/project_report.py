"""BuildProof Project Auditor report (landscape cover matching approved sample).

Only stored supervisor photos and storekeeper documents are rendered.  A first-page
summary is followed by evidence appendix pages containing all submitted originals.
No inferred physical stock count, completion %, AI authenticity verdict, or BOQ
amount is invented.
"""
import io
import json
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.utils import ImageReader, simpleSplit

INK='#141414'; YELLOW='#F4CD19'; PALE='#F6F6F6'; MUTED='#63676C'; LINE='#D2D4D5'; WHITE='#FFFFFF'


def build_project_pdf(result, evidence, bills, upload_root: Path, report_id: int) -> bytes:
    """Build a downloaded PDF from real saved records; do not substitute fake images."""
    out=io.BytesIO()
    c=canvas.Canvas(out,pagesize=landscape(A4),pageCompression=1)
    width,height=landscape(A4)
    margin=26; gap=20; col=(width-2*margin-gap)/2
    left=margin; right=margin+col+gap
    upload_root=Path(upload_root)

    def rect(x,y,w,h,color,stroke=False):
        c.setFillColor(color)
        c.setStrokeColor(LINE)
        c.rect(x,y,w,h,fill=1,stroke=1 if stroke else 0)

    def txt(x,y,value,size=8,bold=False,color=INK,max_width=None):
        font='Helvetica-Bold' if bold else 'Helvetica'
        c.setFont(font,size);c.setFillColor(color)
        val=str(value)
        if max_width is not None:
            while val and c.stringWidth(val,font,size)>max_width:
                val=val[:-1]
            if val != str(value): val=val[:-3]+'...' if len(val)>3 else val
        c.drawString(x,y,val)

    def wrap(x,y,value,max_w,size=7,leading=10,max_lines=3,color=INK):
        lines=simpleSplit(str(value),'Helvetica',size,max_w)
        for line in lines[:max_lines]:
            txt(x,y,line,size,color=color);y-=leading
        return y

    def footer(page,total=None):
        rect(0,0,width,24,INK)
        txt(margin,8,'(C) 2026 BuildProof. All rights reserved.',7,color=WHITE)
        txt(width/2-107,8,'CONFIDENTIAL  /  PROJECT AUDITOR',7,color=YELLOW)
        txt(width-98,8,f'PAGE {page}'+(f' / {total}' if total is not None else ''),7,color=WHITE)

    def image_preview(file_name, mime, x, y, w, h):
        """Render the *original uploaded file* (or its first PDF page) unmodified."""
        rect(x,y,w,h,PALE,stroke=True)
        path=upload_root/file_name
        try:
            if mime=='application/pdf' or path.suffix.lower()=='.pdf':
                import fitz
                with fitz.open(path) as document:
                    if not document.page_count: raise ValueError('Empty PDF')
                    pix=document[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False)
                    im=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
            else:
                with Image.open(path) as source:
                    im=ImageOps.exif_transpose(source).convert('RGB')
            iw,ih=im.size
            scale=min((w-4)/iw,(h-4)/ih)
            iw,ih=iw*scale,ih*scale
            c.drawImage(ImageReader(im),x+(w-iw)/2,y+(h-ih)/2,width=iw,height=ih)
            return True
        except Exception:
            txt(x+7,y+h/2,'Original preview unavailable',7,color=MUTED,max_width=w-14)
            return False

    def bar_chart(x,y,title,rows,w,h=95):
        rect(x,y,w,h,WHITE,stroke=True)
        txt(x+8,y+h-14,title,8,True,max_width=w-16)
        available=[max(0,float(v)) for _,v in rows if v is not None]
        max_value=max(available+[1])
        plot_x=x+106; plot_w=max(20,w-183)
        for i,(label,val) in enumerate(rows[:3]):
            top=y+h-33-i*23
            txt(x+8,top,label,7,max_width=92)
            rect(plot_x,top-1,plot_w,8,PALE)
            if val is not None:
                rect(plot_x,top-1,plot_w*max(0,float(val))/max_value,8,YELLOW)
                rendered=(f'{val:,.0f}' if isinstance(val,(float,int)) else str(val))
            else:
                rendered='N/A'
            txt(plot_x+plot_w+7,top,rendered,7,True,max_width=68)

    def panel_title(x,y,value):
        rect(x,y-20,col,26,INK)
        rect(x,y-20,5,26,YELLOW)
        txt(x+12,y-11,value,11,True,WHITE)

    def info(x,y,key,val):
        txt(x,y,key,7,True,max_width=115)
        wrap(x+126,y,val,col-135,7,9,2)

    # --- Landscape cover, based on the provided approved one-page example ---
    rect(0,height-82,width,82,INK)
    rect(0,height-86,width,4,YELLOW)
    txt(margin,height-35,'BUILDPROOF  /  PROJECT REPORT',19,True,WHITE)
    txt(margin,height-53,'COST VERIFICATION + PLANNING & PROGRESS ANALYSIS',9,False,YELLOW)
    txt(width-128,height-29,'AUDITOR COPY',8,True,YELLOW)
    txt(width-128,height-46,f'REPORT  #{report_id}',8,True,WHITE)
    dt=str(result.get('created_at',''))[:19].replace('T',' ')
    txt(margin,height-104,'PROJECT / MILESTONE  Not provided in current submission records',8,True,max_width=510)
    txt(width-185,height-104,f'GENERATED (UTC)  {dt}',7,color=MUTED)
    rect(width/2-1,137,2,height-264,LINE)
    section_top=height-134
    panel_title(left,section_top,'01  COST / MATERIAL RECONCILIATION')
    panel_title(right,section_top,'02  PLANNING / WORK PROGRESS')
    site=[e for e in evidence if e.category=='site']
    stock=[e for e in evidence if e.category=='stock']
    valid_bills=[b for b in bills if b.unit_rate is not None]
    billed_total=sum(float(b.quantity)*float(b.unit_rate) for b in valid_bills)
    flagged=sum(bool(json.loads(e.image_flags or '[]')) for e in evidence)

    # Invoice and stock thumbnails placed directly in cost column.
    top=section_top-31; box_h=101; tw=(col-9)/2
    if stock: image_preview(stock[-1].storage_name,'image/jpeg',left,top-box_h,tw,box_h)
    else: rect(left,top-box_h,tw,box_h,PALE,stroke=True);txt(left+6,top-box_h/2,'No stock image',7,color=MUTED)
    if bills: image_preview(bills[-1].storage_name,bills[-1].mime_type,left+tw+9,top-box_h,tw,box_h)
    else: rect(left+tw+9,top-box_h,tw,box_h,PALE,stroke=True);txt(left+tw+15,top-box_h/2,'No invoice uploaded',7,color=MUTED)
    txt(left,top-box_h-11,'SUPERVISOR: STOCK IMAGE',7,True,max_width=tw)
    txt(left+tw+9,top-box_h-11,'STOREKEEPER: INVOICE',7,True,max_width=tw)
    # Planning thumbnails are actual site evidence.
    for i in range(2):
        bx=right+i*(tw+9)
        if i<len(site): image_preview(site[i].storage_name,'image/jpeg',bx,top-box_h,tw,box_h)
        else: rect(bx,top-box_h,tw,box_h,PALE,stroke=True);txt(bx+6,top-box_h/2,'No site image',7,color=MUTED)
        txt(bx,top-box_h-11,'SUPERVISOR: SITE IMAGE '+str(i+1),7,True,max_width=tw)

    y=top-box_h-32
    txt(left,y,'BILL / INVOICE DETAILS',8,True)
    txt(right,y,'MILESTONE EVIDENCE & TIMELINE',8,True)
    y-=17
    latest=bills[-1] if bills else None
    info(left,y,'Vendor / invoice',f'{latest.supplier} / {latest.bill_number}' if latest else 'Not submitted')
    info(right,y,'Construction photos',len(site))
    y-=20
    info(left,y,'Material / quantity',f'{latest.material} / {latest.quantity} {latest.unit}' if latest else 'Not submitted')
    info(right,y,'Stock photos',len(stock))
    y-=20
    info(left,y,'Entered invoice value',f'INR {billed_total:,.2f} (known rates only)' if valid_bills else 'Rate unavailable')
    info(right,y,'Verified work progress','Not determinable from image counts')
    y-=20
    info(left,y,'Photo vs invoice','Visual consistency requires manual review')
    info(right,y,'Evidence integrity',f'{flagged} of {len(evidence)} images have flags')
    y-=20
    info(left,y,'Approved BOQ / mismatch','Unavailable / not calculated')
    info(right,y,'Planned vs actual','Schedule and milestone data unavailable')
    y-=20
    info(left,y,'Document checks',f'{len(bills)} bill(s); OCR flags in appendix')
    info(right,y,'AI evaluation','See original evidence / stored AI status')

    rect(margin,144,width-2*margin,2,YELLOW)
    txt(left,158,'COST ANALYSIS / BAR CHART',9,True)
    txt(right,158,'PLANNING ANALYSIS / BAR CHART',9,True)
    bar_chart(left,42,'Submitted cost values (INR)',[
        ('Billed amount',round(billed_total,2) if valid_bills else None),
        ('Approved BOQ',None),('Difference',None)],col)
    bar_chart(right,42,'Submission evidence (number of files)',[
        ('Site images',len(site)),('Stock images',len(stock)),('Flagged',flagged)],col)
    txt(margin,30,'NOT A FINANCIAL CLEARANCE: photos cannot prove quantities or percentage completion.',7,True,color=MUTED)
    footer(1)

    # Actual uploaded photos and invoice files, including ALL files, on appendix pages.
    # This preserves the exact submitted source images rather than stock photography.
    items=[]
    for e in evidence:
        items.append(('SUPERVISOR / '+str(e.category).upper(),e.id,e.storage_name,'image/jpeg',
            f'Capture: {e.captured_at or "not recorded"}  |  AI check: {e.ai_status or "NOT_EVALUATED"}'))
    for b in bills:
        items.append(('STOREKEEPER / INVOICE',b.id,b.storage_name,b.mime_type,
            f'{b.supplier}  |  Bill {b.bill_number}  |  {b.material}  {b.quantity} {b.unit}'))
    for start in range(0,len(items),6):
        c.showPage();page=2+start//6
        rect(0,height-61,width,61,INK)
        txt(margin,height-32,'BUILDPROOF  /  ORIGINAL SUBMISSION EVIDENCE',14,True,WHITE)
        txt(margin,height-47,'All previews are derived from saved original uploaded files.',8,color=YELLOW)
        for n,(tag,id_,file_name,mime,detail) in enumerate(items[start:start+6]):
            column=n%3; row=n//3
            w=(width-2*margin-28)/3
            x=margin+column*(w+14)
            image_h=170; y_img=height-256-row*237
            rect(x,y_img-30,w,image_h+63,WHITE,stroke=True)
            txt(x+5,y_img+image_h+18,f'{tag}  #{id_}',8,True,max_width=w-10)
            image_preview(file_name,mime,x+5,y_img+4,w-10,image_h-8)
            wrap(x+5,y_img-9,detail,w-10,6.5,9,2)
        footer(page)
    c.save()
    return out.getvalue()
