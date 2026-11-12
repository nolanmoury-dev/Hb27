// Une seule fonction pour tous les comptes : moins d'appels Vercel, moins de fichiers.
const {sb,hash,sign,verify,AP,mac,crypto}=require('./_lib');
const err=(res,c,m)=>res.status(c).json({error:m});
const pub=u=>({id:u.id,pseudo:u.pseudo,role:u.role,points:u.points,played:u.played,av:u.avatar||'',sq:u.secret_q||''});
const banned=u=>u.banned_until&&new Date(u.banned_until)>new Date();
async function who(req){const id=verify((req.headers.authorization||'').replace('Bearer ',''));if(!id)return null;
  const [u]=await sb(`players?id=eq.${encodeURIComponent(id)}&select=*`);return u&&!banned(u)?u:null}
module.exports=async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin',process.env.ALLOWED_ORIGIN||'*');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return err(res,405,'POST uniquement');
  const b=req.body||{};
  try{switch(b.a){
    case'register':{const p=String(b.pseudo||'').trim(),w=String(b.password||'');
      if(!/^[A-Za-z0-9_.-]{3,16}$/.test(p))return err(res,400,'Pseudo : 3 à 16 caractères (lettres, chiffres, _ . -)');
      if(w.length<6)return err(res,400,'Mot de passe : 6 caractères minimum');
      const sq=String(b.secretQ||'').trim().slice(0,80),sa=String(b.secretA||'').trim().toLowerCase().slice(0,60),adm=p.toLowerCase()===AP;
      // Pseudo administrateur réservé : seul celui qui connaît ADMIN_PASSWORD (variable Vercel, jamais dans le code) peut le créer.
      if(adm&&!(process.env.ADMIN_PASSWORD&&mac(w)===mac(process.env.ADMIN_PASSWORD)))return err(res,403,'Ce pseudo est réservé');
      const salt=crypto.randomBytes(16).toString('hex');
      try{const [u]=await sb('players',{method:'POST',body:Object.assign({pseudo:p,pseudo_lc:p.toLowerCase(),pass_hash:hash(w,salt),salt,role:adm?'admin':'player'},sq.length>=5&&sa.length>=2?{secret_q:sq,secret_a:hash(sa,salt)}:{})});
        return res.json({token:sign(u.id),user:pub(u)})}catch(e){if(e.status===409)return err(res,409,'Pseudo déjà pris');throw e}}
    case'login':{const [u]=await sb(`players?pseudo_lc=eq.${encodeURIComponent(String(b.pseudo||'').trim().toLowerCase())}&select=*`);
      if(!u)return err(res,401,'Pseudo ou mot de passe incorrect');
      if(banned(u))return err(res,403,'Compte bloqué jusqu\'au '+new Date(u.banned_until).toLocaleString('fr-FR'));
      const h=hash(String(b.password||''),u.salt);
      if(h.length!==u.pass_hash.length||!crypto.timingSafeEqual(Buffer.from(h),Buffer.from(u.pass_hash))){return err(res,401,'Pseudo ou mot de passe incorrect')}
      return res.json({token:sign(u.id),user:pub(u)})}
    case'secret_q':{const [u]=await sb(`players?pseudo_lc=eq.${encodeURIComponent(String(b.pseudo||'').trim().toLowerCase())}&select=secret_q,role`);
      if(!u||u.role==='admin')return err(res,404,'Compte introuvable');return res.json({question:u.secret_q||''})}
    case'pwd_reset':{const w=String(b.password||'');if(w.length<6)return err(res,400,'Mot de passe : 6 caractères minimum');
      const [u]=await sb(`players?pseudo_lc=eq.${encodeURIComponent(String(b.pseudo||'').trim().toLowerCase())}&select=*`);
      if(!u||u.role==='admin'||!u.secret_a)return err(res,403,'Réponse incorrecte');
      const h=hash(String(b.answer||'').trim().toLowerCase(),u.salt);
      if(h.length!==u.secret_a.length||!crypto.timingSafeEqual(Buffer.from(h),Buffer.from(u.secret_a)))return err(res,403,'Réponse incorrecte');
      await sb(`players?id=eq.${u.id}`,{method:'PATCH',body:{pass_hash:hash(w,u.salt)}});return res.json({ok:1})}
    case'set_secret':{const u=await who(req);if(!u)return err(res,401,'Session expirée');
      const sq=String(b.question||b.secretQ||'').trim().slice(0,80),sa=String(b.answer||b.secretA||'').trim().toLowerCase().slice(0,60);
      if(sq.length<5||sa.length<2)return err(res,400,'Question : 5 caractères minimum, réponse : 2');
      await sb(`players?id=eq.${u.id}`,{method:'PATCH',body:{secret_q:sq,secret_a:hash(sa,u.salt)}});return res.json({ok:1})}
    case'me':{const u=await who(req);return u?res.json({user:pub(u)}):err(res,401,'Session expirée')}
    case'avatar':{const u=await who(req);if(!u)return err(res,401,'Session expirée');const v=String(b.av||'');
      if(v&&(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)||v.length>30000))return err(res,400,'Photo invalide ou trop lourde');
      await sb(`players?id=eq.${u.id}`,{method:'PATCH',body:{avatar:v||null}});return res.json({ok:1})}
    default:{ // actions admin
      const u=await who(req);if(!u||u.role!=='admin')return err(res,403,'Réservé à l\'administrateur');
      if(b.a==='admin_list')return res.json({players:await sb('players?select=id,pseudo,role,points,played,banned_until,created_at&order=created_at.desc&limit=200')});
      const id=encodeURIComponent(String(b.id||'')),[t]=await sb(`players?id=eq.${id}&select=id,role`);
      if(!t)return err(res,404,'Compte introuvable');if(t.role==='admin')return err(res,400,'Impossible sur un administrateur');
      if(b.a==='admin_ban'){const m=+b.minutes;await sb(`players?id=eq.${id}`,{method:'PATCH',body:{banned_until:m>0?new Date(Date.now()+m*6e4).toISOString():'9999-12-31T00:00:00Z'}});return res.json({ok:1})}
      if(b.a==='admin_unban'){await sb(`players?id=eq.${id}`,{method:'PATCH',body:{banned_until:null,fails:0,locked_until:null}});return res.json({ok:1})}
      if(b.a==='admin_delete'){await sb(`players?id=eq.${id}`,{method:'DELETE'});return res.json({ok:1})}
      return err(res,400,'Action inconnue')}}}
  catch(e){console.error(e);
    const miss=['SUPABASE_URL','SUPABASE_SERVICE_KEY','TOKEN_SECRET'].filter(k=>!(process.env[k]||'').trim());
    if(miss.length)return err(res,500,'Variable manquante sur Vercel : '+miss.join(', ')+' (puis Redeploy)');
    if(e.status)return err(res,500,'Supabase a répondu '+e.status+' : '+String(e.message).slice(0,160));
    return err(res,500,'Erreur serveur : '+String(e.message).slice(0,120))}};
