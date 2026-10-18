"""Regression tests for auditor-only downloadable project PDF layout."""
import io
from types import SimpleNamespace
import fitz
from PIL import Image
from app.project_report import build_project_pdf


def test_cover_layout_and_real_uploaded_images(tmp_path):
    # Distinct original image colors make it easy to inspect rendered evidence.
    Image.new('RGB',(240,180),'red').save(tmp_path/'site.png')
    Image.new('RGB',(240,180),'green').save(tmp_path/'stock.png')
    Image.new('RGB',(240,180),'blue').save(tmp_path/'bill.png')
    evidence=[
        SimpleNamespace(id=1,category='site',storage_name='site.png',image_flags='[]',captured_at='2026-10-10T06:00:00',ai_status='NOT_EVALUATED'),
        SimpleNamespace(id=2,category='stock',storage_name='stock.png',image_flags='[]',captured_at='2026-10-10T06:01:00',ai_status='NOT_EVALUATED')]
    invoice=SimpleNamespace(id=3,storage_name='bill.png',mime_type='image/png',supplier='Demo vendor',bill_number='A-123',material='cement',quantity=12,unit='bags',unit_rate=250)
    result={'created_at':'2026-10-10T00:00:00Z','invoice_findings':[]}
    data=build_project_pdf(result,evidence,[invoice],tmp_path,42)
    assert data.startswith(b'%PDF-')
    doc=fitz.open(stream=data,filetype='pdf')
    assert len(doc)==2   # cover plus all submitted images appendix
    assert round(doc[0].rect.width)==842
    cover=doc[0].get_text()
    for s in ('PROJECT REPORT','COST / MATERIAL RECONCILIATION', 'PLANNING / WORK PROGRESS',
              'COST ANALYSIS / BAR CHART','PLANNING ANALYSIS / BAR CHART',
              '(C) 2026 BuildProof','A-123'):
        assert s in cover
    assert len(doc[0].get_images(full=True))>=3  # real site, stock, bill uploads on cover
    assert len(doc[1].get_images(full=True))>=3
    assert 'Not determinable from image counts' in cover


def test_empty_report_is_valid_one_page(tmp_path):
    data=build_project_pdf({'created_at':'2026-10-10T00:00:00Z'},[],[],tmp_path,5)
    doc=fitz.open(stream=data,filetype='pdf')
    assert len(doc)==1
    assert 'No invoice uploaded' in doc[0].get_text()
