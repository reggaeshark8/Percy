import re,sys
src=sys.argv[1]
s=open(src,encoding='utf-8').read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(a[:70],s.count(a)); s=s.replace(a,b)
# head
s=re.sub(r'<link rel="preconnect"[^\n]*\n<link rel="preconnect"[^\n]*\n<link rel="stylesheet" href="https://fonts.googleapis[^\n]*\n','',s)
s=s.replace('<meta name="claude:viewport-fit-sides" content="cover">','<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0E5A5A">')
s='<!doctype html><html lang="en"><head>'+s
fonts="@font-face{font-family:'Atkinson Hyperlegible';font-weight:400;font-style:normal;font-display:swap;src:url(fonts/atkinson-hyperlegible-latin-400-normal.woff2) format('woff2')}\n@font-face{font-family:'Atkinson Hyperlegible';font-weight:700;font-style:normal;font-display:swap;src:url(fonts/atkinson-hyperlegible-latin-700-normal.woff2) format('woff2')}\n"
rep('<style>\n','<style>\n'+fonts)
# shim before main script
shim=open('tools/shim.js',encoding='utf-8').read()
rep('<script>\n','<script>\n'+shim+'\n</script>\n<script>\n')
# file links -> open via native
s,n=re.subn(r'href="/_blob/\'\+esc\(([\w.]+)\.id\)\+\'" target="_blank" rel="noopener"',
  r'''href="#" data-act="openfile" data-id="'+esc(\1.id)+'" data-type="'+esc(\1.type||'')+'"''',s)
assert n>=4,n
rep('''<img src="/_blob/'+esc(f.id)+'" alt="" loading="lazy">''','''<img '+(window.PERCY_NATIVE?'data-blob="':'src="/_blob/')+esc(f.id)+'" alt="" loading="lazy">''')
rep("if(e.target.closest('a[href]'))return;","var an=e.target.closest('a[href]');if(an&&!an.dataset.act)return;")
rep("  tab:function(el){go(el.dataset.v);},\n","  tab:function(el){go(el.dataset.v);},\n  openfile:function(el){if(window.PercyNative)window.PercyNative.open(el.dataset.id,el.dataset.type);},\n  saveKey:function(){var i=$('#apiKey'),v=(i&&i.value||'').trim();if(!v){toast('Paste your key first.');return;}lsSet('percy.apikey',v);i.value='';toast('Key saved on this phone.');renderAll();},\n")
# banner + data page
rep("if(S.mode==='local')banners+=","if(S.mode==='local'&&!window.PERCY_NATIVE)banners+=")
rep("var where=S.mode==='cloud'?","var where=window.PERCY_NATIVE?'Your items are saved on this phone, inside the Percy app. Files you attach are saved in your phone’s Documents folder under Percy, in a folder for each trip. Export a backup before you uninstall the app or change phones.':S.mode==='cloud'?")
rep("  h+='<div class=\"card\"><p>'+esc(where)+'</p></div>';\n","  h+='<div class=\"card\"><p>'+esc(where)+'</p></div>';\n  if(window.PERCY_NATIVE)h+=keyCardHTML();\n")
rep("function viewData(){","""function keyCardHTML(){
  var has=!!lsGet('percy.apikey');
  return '<div class="card" style="display:flex;flex-direction:column;gap:10px"><h3 style="font:700 1.125rem var(--f-body)">Reading booking confirmations</h3><p class="note">To fill in bookings from a PDF or screenshot, Percy sends the file to Claude using your own Anthropic API key. Get a key at console.anthropic.com. Each confirmation costs a few cents. The key stays on this phone.</p><div class="fld"><label for="apiKey">Anthropic API key'+(has?' (saved)':'')+'</label><input id="apiKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="'+(has?'Paste a new key to replace it':'sk-ant-…')+'"></div><div><button class="btn" type="button" data-act="saveKey">Save key</button></div></div>';
}
function viewData(){""")
rep("toast('Saved');}\n  catch(e){if(!e||e.code!=='declined')","toast(r&&r.where?'Saved in '+r.where:'Saved');}\n  catch(e){if(!e||e.code!=='declined')")
rep("try{await caps.downloads.save({filename:name,data:data});","try{var r=await caps.downloads.save({filename:name,data:data});")
# folders
rep("function openSheet(","""function folderFor(o){var t=o.tripId&&S.items.get(o.tripId);return t?(t.name||'Trip'):({doc:'Vault',lease:'Home',maint:'Home',receipt:'Receipts',vehicle:'Vehicle'}[o.kind]||'Other');}
function openSheet(""")
rep("var r=await caps.assets.upload(file,{type:type});","var r=await caps.assets.upload(file,{type:type,folder:folderFor(Object.assign({kind:f.kind},obj))});")
rep("var up=await caps.assets.upload(x.file,{type:fileKind(x.file)});","var up=await caps.assets.upload(x.file,{type:fileKind(x.file),folder:folderFor({kind:'booking',tripId:I.tripId})});")
# pdf native + errors
rep("var pi=await pdfToInput(x.file);","var pi=caps.sample.nativePdf?{text:'',images:[x.file]}:await pdfToInput(x.file);")
rep("function impErr0(e){\n  var c=e&&e.code;\n  return c==='not_granted'","function impErr0(e){\n  var c=e&&e.code;\n  return c==='no_key'?'Add your Anthropic API key first: More, then Backup & data.'\n    :c==='bad_key'?'The API key was not accepted. Check it in More, then Backup & data.'\n    :c==='offline'?'No internet connection. Connect and try again.'\n    :c==='not_granted'")
rep("e.code==='session_expired'))","e.code==='session_expired'||e.code==='no_key'||e.code==='bad_key'))")
open('www/index.html','w',encoding='utf-8').write(s)
print('built',len(s))
