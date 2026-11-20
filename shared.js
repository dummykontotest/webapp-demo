(() => {
 const nav=document.querySelector("header nav");
 const filesNav=document.querySelector("#files-nav");
 const signOut=document.querySelector("#sign-out");
 const bar=document.querySelector("#sync-bar");
 const indicator=document.querySelector("#sync-status");
 const reload=document.querySelector("#reload-shared");
 const exportEdits=document.querySelector("#export-conflict");
 let role=null, revision=0, pending=false, sending=false, conflict=false;
 let timer, fileList=[], fileMessage="";
 const shared=window.deskShared={enabled:false,save:queueSave,render:sharedRender};

 async function request(url, options){
  const response=await fetch(url,options);
  const isJson=response.headers.get("Content-Type")?.includes("application/json");
  const data=isJson?await response.json():null;
  if(!response.ok||!isJson){
   const message=data?.error||([401,403].includes(response.status)||response.redirected
    ?"The access gateway blocked this request. Reopen the tunnel link in your browser and complete the email-code check again."
    :"The server returned an unexpected response (HTTP "+response.status+"). Check that the sample server and tunnel are running.");
   const error=new Error(message);
   error.status=response.status;
   throw error;
  }
  return data;
 }
 function post(path,data){
  return request(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
 }
 function status(message){
  indicator.textContent=message;
  reload.hidden=!conflict;
  exportEdits.hidden=role!=="supervisor"||(!conflict&&!pending&&!sending);
 }
 function resetSensitive(){
  Object.assign(state,{out:{},in:{},settings:{}});
  for(const key of Object.keys(extracted))delete extracted[key];
  for(const key of Object.keys(photos)){URL.revokeObjectURL(photos[key]);delete photos[key];}
  finalFile=undefined;
  fileList=[];
 }
 function setSession(next){
  role=next;
  nav.hidden=!role;
  signOut.hidden=!role;
  filesNav.hidden=!role;
  bar.hidden=!role;
  [...nav.querySelectorAll("a")].filter(a=>a!==filesNav).forEach(a=>a.hidden=role!=="supervisor");
 }
 function apply(data){
  Object.assign(state,data.draft);
  revision=data.revision;
 }
 async function load(){
  const data=await request("/api/draft");
  apply(data);
  conflict=false;
  status("Shared draft saved");
  render();
 }
 function showConflict(){
  conflict=true;
  status("The shared draft changed on another device. Export your edits if needed, then load the shared version.");
 }
 function queueSave(){
  if(role!=="supervisor")return;
  pending=true;
  if(conflict)return showConflict();
  status("Saving shared draft…");
  clearTimeout(timer);
  timer=setTimeout(flush,450);
 }
 async function flush(){
  if(sending||conflict||!pending||role!=="supervisor")return;
  sending=true;
  pending=false;
  const sent=JSON.stringify(state);
  let saved=false;
  try{
   const data=await post("/api/draft",{revision,draft:JSON.parse(sent)});
   revision=data.revision;
   if(!pending)apply(data);
   status(pending?"Saving shared draft…":"Shared draft saved");
   saved=true;
  }catch(error){
   pending=true;
   if(error.status===409)showConflict();
   else status(error.status===401?"Session expired. Export unsaved edits, then sign out and back in.":"Changes are unsaved. Reconnecting…");
  }finally{
   sending=false;
   if(saved&&!pending)status("Shared draft saved");
   if(!conflict&&pending){clearTimeout(timer);timer=setTimeout(flush,saved?200:5000);}
  }
 }
 function signIn(){
  app.innerHTML=title("B-102 Handover Desk","Sign in with the account created for your role.")+
   card("Sign in",'<form id="desk-login"><label class="field"><span>Account</span><select name="role"><option value="supervisor">Agent / Broker</option><option value="landlord">Landlord</option></select></label><label class="field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label><button class="primary" type="submit">Sign in</button><p id="login-error" role="status"></p></form>','signin');
  const form=app.querySelector("form");
  form.addEventListener("submit",async event=>{
   event.preventDefault();
   const button=form.querySelector("button");
   button.disabled=true;
   try{
    const credentials=Object.fromEntries(new FormData(form));
    const result=await post("/api/login",credentials);
    const draft=await request("/api/draft");
    setSession(result.role);
    apply(draft);
    history.replaceState(null,"","#home");
    status("Shared draft saved");
    render();
   } catch(error){form.querySelector("#login-error").textContent=error.message;button.disabled=false;}
  });
 }
 function landlordPage(){
  const s=settlement(), t=terms();
  const approval=(label,id,on)=>'<button type="button" class="'+(on?'share':'primary')+'" data-approval="'+id+'" data-value="'+(!on)+'">'+(on?"Withdraw approval":label)+'</button>';
  app.innerHTML=title("Landlord dashboard","Review the agent’s settlement, proposed terms and signing appointment.")+
   '<div class="grid">'+card("Move-out settlement",'<p>'+esc(get("out","name")||"Outgoing tenant")+' · '+count("out")+' of 31 checks</p>'+statement(s)+
    '<p>'+(!s.needs?"Within standing limits":get("out","approved")?"Approved":"Approval requested")+'</p>'+
    (s.needs||get("out","approved")?approval("Approve settlement","settlement",get("out","approved")):""))+
   card("Move-in terms",'<p>'+esc(get("in","name")||"Incoming tenant")+'</p><p>Rent '+money(t.rent)+' · Deposit '+money(t.deposit)+' · Advance '+money(t.advance)+'</p><p>'+esc(t.start?"From "+fmt(t.start)+" through "+fmt(t.end):"Agreement dates pending")+'</p>'+
    '<p>'+(!t.needs?"Within standing limits":get("in","termsApproved")?"Approved":"Approval requested")+'</p>'+
    (t.needs||get("in","termsApproved")?approval("Approve terms","terms",get("in","termsApproved")):""))+
   card("Signing appointment","<p>"+(get("in","signDate")?esc(fmt(get("in","signDate"))+" · "+get("in","signTime")+" · "+get("in","office")):"Appointment pending")+"</p>")+
   card("Standing instructions",'<form id="owner-limits">'+fields(...Object.entries(limitLabels).map(([key,label])=>'<label class="field"><span>'+label+'</span><input type="number" name="'+key+'" min="0" max="1000000000" step="any" value="'+num(get("settings",key))+'" required></label>'))+'<button type="submit" class="primary">Save standing limits</button></form>')+'</div>'+link("Open shared files","files","share");
  app.querySelector("#owner-limits").addEventListener("submit",async event=>{
   event.preventDefault();
   if(sending||conflict)return;
   const form=event.currentTarget, button=form.querySelector("button");
   const limits=Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,Number(value)]));
   button.disabled=true;
   sending=true;
   try{
    apply(await post("/api/draft",{revision,limits}));
    status("Standing limits saved");
    render();
   }catch(error){
    if(error.status===409)showConflict();
    else if(error.status===403 && error.message==="Landlords can update approvals only."){
     toast("The local server is running an older version. Restart it, then refresh this page.");
    }else toast(error.message);
   }
   finally{sending=false;button.disabled=false;}
  });
 }
 function renderFiles(){
  app.innerHTML=title("Shared files","Download the documents and photos saved for this flat.")+
   card("Documents and photos",(role==="supervisor"?'<label class="field"><span>Upload a PDF, JPG or PNG</span><input type="file" id="archive-file" accept="application/pdf,image/jpeg,image/png"></label>':"")+
    (fileMessage?"<p>"+esc(fileMessage)+"</p>":"")+(fileList.length?'<ul class="file-list">'+fileList.map(file=>'<li><a class="button" href="/api/files/'+encodeURIComponent(file.id)+'">'+esc(file.name)+'</a>'+(role==="supervisor"?'<button type="button" data-delete-file="'+esc(file.id)+'">Delete</button>':"")+'</li>').join("")+'</ul>':"<p>No shared files yet.</p>"));
 }
 async function loadFiles(){
  try{fileList=(await request("/api/files")).files;}
  catch(error){fileMessage=error.message;}
  if(role && location.hash==="#files")renderFiles();
 }
 function sharedRender(){
  if(!shared.enabled)return false;
  if(!role){signIn();return true;}
  if(location.hash==="#files"){renderFiles();loadFiles();return true;}
  if(role==="landlord"){landlordPage();return true;}
  return false;
 }
 app.addEventListener("click",async event=>{
  const button=event.target.closest("[data-approval],[data-delete-file]");
  if(!button)return;
  button.disabled=true;
  if(button.dataset.approval)sending=true;
  try{
   if(button.dataset.deleteFile){
    if(!confirm("Delete this file from the shared library?"))return;
    await post("/api/files/delete",{id:button.dataset.deleteFile});
    fileMessage="File deleted.";
    await loadFiles();
   }else{
    apply(await post("/api/draft",{revision,approval:button.dataset.approval,value:button.dataset.value==="true"}));
    status("Approval saved");render();
   }
  }catch(error){if(error.status===409)showConflict();else toast(error.message);}
  finally{button.disabled=false;if(button.dataset.approval)sending=false;}
 });
 app.addEventListener("change",async event=>{
  if(event.target.id!=="archive-file"||!event.target.files[0])return;
  const input=event.target,file=input.files[0];
  input.disabled=true;
  fileMessage="";
  try{
   await request("/api/files",{method:"POST",headers:{"Content-Type":file.type,"X-File-Name":encodeURIComponent(file.name)},body:file});
   fileMessage="File saved.";
  }catch(error){fileMessage=error.message;}
  await loadFiles();
 });
 reload.addEventListener("click",async()=>{
  if(sending||(pending&&!confirm("Discard unsaved edits and load the shared draft?")))return;
  try{await load();pending=false;status("Shared draft saved");}catch(error){toast(error.message);}
 });
 exportEdits.addEventListener("click",()=>fileDownload(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),"B-102-unsaved-edits.json"));
 signOut.addEventListener("click",async()=>{
  if(sending){toast("Wait for the current save to finish.");return;}
  if(pending&&!confirm("Sign out and discard unsaved edits?"))return;
  try{await post("/api/logout",{});}catch(error){if(error.status!==401){toast(error.message);return;}}
  clearTimeout(timer);pending=false;conflict=false;resetSensitive();setSession(null);render();
 });
 window.addEventListener("beforeunload",event=>{
  if(role&&(pending||sending)){event.preventDefault();event.returnValue="";}
 });
 async function poll(){
  if(!role||pending||sending||conflict)return;
  try{
   const data=await request("/api/draft");
   if(!role||pending||sending||conflict||data.revision<=revision)return;
   if(app.contains(document.activeElement)&&document.activeElement.matches("input,textarea,select"))return;
   apply(data);status("Updated from shared draft");render();
  }catch{}
 }
 async function start(){
  if(!hosted)return;
  nav.hidden=true;
  try{
   const info=await request("/api/session");
   shared.enabled=true;
   resetSensitive();
   setSession(info.role);
   if(role)await load();
   else render();
   setInterval(poll,7000);
  }catch(error){
   if(shared.enabled){setSession(null);render();toast(error.message);}
   else app.textContent="The shared server could not be reached. Refresh to retry.";
  }
 }
 start();
})();



