for tab in list_tabs():
    if "release=icons-20260904" in tab.get("url", ""):
        switch_tab(tab, activate=True)
        print(js("(async()=>({controller:navigator.serviceWorker.controller?.scriptURL||null,resources:await Promise.all(['/ledger/','/ledger/manifest.webmanifest','/ledger/sw.js','/app/landing.html','/health'].map(async p=>{const r=await fetch(p,{cache:'no-store'});return {path:p,status:r.status,type:r.headers.get('content-type')}}))}))()"))
        break
