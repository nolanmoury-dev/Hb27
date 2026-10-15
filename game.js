// Équipes, classement, matchs, outils admin. Une seule fonction = reste dans le plan gratuit Vercel.
const {sb,verify}=require('./_lib');
const err=(res,c,m)=>res.status(c).json({error:m});
const banned=u=>u.banned_until&&new Date(u.banned_until)>new Date();
async function who(req){const id=verify((req.headers.authorization||'').replace('Bearer ',''));if(!id)return null;
  const [u]=await sb(`players?id=eq.${encodeURIComponent(id)}&select=id,pseudo,role,banned_until`);return u&&!banned(u)?u:null}
const col=c=>/^#[0-9a-fA-F]{6}$/.test(c)?c:'#1e7bff';
const pubT=t=>({id:t.id,name:t.name,c1:t.c1,c2:t.c2,crest:t.crest||'',roster:t.roster,pts:t.pts,pl:t.played,w:t.w,d:t.d,l:t.l,gf:t.gf,ga:t.ga,form:t.form});
async function apply(t,gf,ga){const r=gf>ga?'W':gf<ga?'L':'D';
  await sb(`teams?id=eq.${t.id}`,{method:'PATCH',body:{pts:t.pts+(r==='W'?3:r==='D'?1:0),played:t.played+1,w:t.w+(r==='W'),d:t.d+(r==='D'),l:t.l+(r==='L'),gf:t.gf+gf,ga:t.ga+ga,form:(t.form+r).slice(-5)}})}
module.exports=async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin',process.env.ALLOWED_ORIGIN||'*');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return err(res,405,'POST uniquement');
  const b=req.body||{};
  try{const u=await who(req);if(!u)return err(res,401,'Session expirée');
    switch(b.a){
      case'board':return res.json({teams:(await sb('teams?select=*&order=pts.desc,gf.desc&limit=100')).map(pubT)});
      case'myteam':{const [t]=await sb(`teams?owner=eq.${u.id}&select=*`);return res.json({team:t?pubT(t):null})}
      case'saveteam':{const n=String(b.name||'').trim();if(n.length<2||n.length>20)return err(res,400,'Nom d\'équipe : 2 à 20 caractères');
        const cr=String(b.crest||'');if(cr&&(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(cr)||cr.length>30000))return err(res,400,'Écusson trop lourd');
        const ro=(Array.isArray(b.roster)?b.roster:[]).slice(0,6).map((p,i)=>({n:String(p.n||'').slice(0,14)||'Joueur '+i,num:Math.min(99,Math.max(0,+p.num||0)),sk:Math.min(3,Math.max(0,+p.sk||0)),pos:i?'J':'G'}));
        const body={name:n,name_lc:n.toLowerCase(),c1:col(b.c1),c2:col(b.c2),crest:cr||null,roster:ro};
        const [t]=await sb(`teams?owner=eq.${u.id}&select=id`);
        try{const [r]=t?await sb(`teams?id=eq.${t.id}`,{method:'PATCH',body}):await sb('teams',{method:'POST',body:Object.assign({owner:u.id},body)});return res.json({team:pubT(r)})}
        catch(e){if(e.status===409)return err(res,409,'Nom d\'équipe déjà pris');throw e}}
      case'result':{ // match lancé ensemble : le score est enregistré une seule fois, par l'un des deux propriétaires ou l'admin
        const [h]=await sb(`teams?id=eq.${encodeURIComponent(String(b.home||''))}&select=*`),[a]=await sb(`teams?id=eq.${encodeURIComponent(String(b.away||''))}&select=*`);
        if(!h||!a||h.id===a.id)return err(res,400,'Équipes invalides');
        if(u.role!=='admin'&&u.id!==h.owner&&u.id!==a.owner)return err(res,403,'Tu ne joues pas ce match');
        const hs=Math.floor(+b.hs),as=Math.floor(+b.as);if(!(hs>=0&&as>=0&&hs<100&&as<100))return err(res,400,'Score invalide');
        const rec=await sb(`matches?or=(and(home.eq.${h.id},away.eq.${a.id}),and(home.eq.${a.id},away.eq.${h.id}))&created_at=gte.${new Date(Date.now()-3e5).toISOString()}&select=id`);
        if(rec.length)return err(res,409,'Ce match est déjà enregistré');
        await sb('matches',{method:'POST',body:{home:h.id,away:a.id,hs,as_:as,by:u.id}});await apply(h,hs,as);await apply(a,as,hs);return res.json({ok:1})}
      case'admin_reset':case'admin_teamdel':{if(u.role!=='admin')return err(res,403,'Réservé à l\'administrateur');
        if(b.a==='admin_reset'){await sb('teams?id=not.is.null',{method:'PATCH',body:{pts:0,played:0,w:0,d:0,l:0,gf:0,ga:0,form:''}});await sb('matches?id=not.is.null',{method:'DELETE'});return res.json({ok:1})}
        await sb(`teams?id=eq.${encodeURIComponent(String(b.id||''))}`,{method:'DELETE'});return res.json({ok:1})}
      default:return err(res,400,'Action inconnue')}}
  catch(e){console.error(e);return err(res,500,'Erreur serveur : '+String(e.message).slice(0,140))}};
