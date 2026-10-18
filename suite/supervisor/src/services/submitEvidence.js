export async function submitEvidence(category, files) {
  if (!['site','stock'].includes(category) || files.length < 3 || files.length > 6) throw new Error('Capture 3 to 6 live photos.');
  const captureResponse = await fetch('/api/workflow/capture-session?category='+encodeURIComponent(category), {method:'POST',credentials:'same-origin'});
  const captureInfo = await captureResponse.json();
  if (!captureResponse.ok) throw new Error(captureInfo.detail || 'Capture session failed');
  const data = new FormData();
  data.append('category',category);data.append('capture_token',captureInfo.token);
  data.append('captured_at',new Date().toISOString());
  for (const file of files) data.append('images',file);
  const response = await fetch('/api/workflow/evidence',{method:'POST',body:data,credentials:'same-origin'});
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || 'Upload failed');
  return result;
}
