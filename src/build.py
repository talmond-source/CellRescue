from pathlib import Path
import base64,json
root=Path(__file__).resolve().parent
# sprites and portraits come pre-cut from src/baked (run tools/bake_sprites.py after changing art); backgrounds from src/packed
srcs={p.stem:p for p in sorted((root/'packed').glob('*.png'))}
srcs.update({p.stem:p for p in sorted((root/'baked').glob('*.png'))})
assets={k:'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode() for k,p in srcs.items()}
meta=(root/'baked'/'sprite-meta.json').read_text()
font='@font-face{font-family:"Press Start 2P";src:url(data:font/woff2;base64,'+base64.b64encode((root/'fonts'/'PressStart2P-latin.woff2').read_bytes()).decode()+') format("woff2");font-display:swap} /* Press Start 2P, SIL Open Font License 1.1 (src/fonts) */'
page=(root/'index.html').read_text().replace('/*FONTS*/',font).replace('/*ASSETS*/','const ASSETS='+json.dumps(assets)+';const SPRITE_META='+meta+';').replace('/*CAMPAIGNS*/',(root/'campaigns.js').read_text()).replace('/*QUESTIONS*/',(root/'questions.js').read_text()).replace('/*DIAGRAMS*/',(root/'diagrams.js').read_text()).replace('/*MOLECULES*/',(root/'molecules.js').read_text()).replace('/*LEVELS*/',(root/'levels.js').read_text()+'\n'+(root/'combat.js').read_text()+'\n'+(root/'shooter.js').read_text()+'\n'+(root/'topdown.js').read_text()+'\n'+(root/'boss.js').read_text()).replace('/*MISSIONS*/',(root/'missions.js').read_text()).replace('/*ENGINE*/',(root/'engine.js').read_text()+'\n'+(root/'gamepad.js').read_text()+'\n'+(root/'intro.js').read_text())
out=root.parent/'index.html'
out.write_text(page)
print(str(out));print(f'{len(assets)} embedded assets; {out.stat().st_size/1024/1024:.1f} MB')
