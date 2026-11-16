from pathlib import Path
import base64,json
root=Path(__file__).resolve().parent
assets={p.stem:'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode() for p in sorted((root/'packed').glob('*.png'))}
page=(root/'index.html').read_text().replace('/*ASSETS*/','const ASSETS='+json.dumps(assets)+';').replace('/*CAMPAIGNS*/',(root/'campaigns.js').read_text()).replace('/*MISSIONS*/',(root/'missions.js').read_text()).replace('/*ENGINE*/',(root/'engine.js').read_text())
out=root.parent/'index.html'
out.write_text(page)
print(str(out));print(f'{len(assets)} embedded assets; {out.stat().st_size/1024/1024:.1f} MB')
