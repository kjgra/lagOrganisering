import json,sys
t=json.load(open(sys.argv[1])); out=sys.argv[2]
themes=[x["id"] for x in t["color"]["themes"]]
def val(v,th):
    if isinstance(v,dict): return v.get(th, v[themes[0]])
    return v
light=[];dark=[]
for tok in t["color"]["tokens"]:
    light.append(f'  --{tok["name"]}: {val(tok["value"],"light")};')
    d=val(tok["value"],"dark")
    if d!=val(tok["value"],"light"): dark.append(f'  --{tok["name"]}: {d};')
for fam in ["shadow"]:
    for tok in t[fam]["tokens"]:
        light.append(f'  --{tok["name"]}: {val(tok["value"],"light")};')
        dark.append(f'  --{tok["name"]}: {val(tok["value"],"dark")};')
static=[]
for fam in ["spacing","radius","size","borderWidth"]:
    for tok in t[fam]["tokens"]: static.append(f'  --{tok["name"]}: {tok["value"]};')
fams=t["type"]["families"]
static.append(f'  --font-sans: {fams["sans"]};')
static.append(f'  --font-display: {fams["display"]};')
cls=[]
for g in t["type"]["groups"]:
    for s in g["styles"]:
        f=s.get("family",g["family"])
        p=[f'  font-family: var(--font-{f});',f'  font-size: {s["fontSize"]};',f'  line-height: {s["lineHeight"]};',f'  font-weight: {s["fontWeight"]};']
        if "letterSpacing" in s: p+= [f'  letter-spacing: {s["letterSpacing"]};','  text-transform: uppercase;']
        cls.append(f'.{s["name"]} {{\n'+"\n".join(p)+'\n}')
L="\n".join(light);D="\n".join(dark)
css=f"""/* Nymark – Gruppeorganisering — generated from design/tokens.json. Do not edit by hand. */
:root {{
{chr(10).join(static)}
{L}
  color-scheme: light;
}}

@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
{D}
    color-scheme: dark;
  }}
}}

:root[data-theme="dark"] {{
{D}
  color-scheme: dark;
}}

/* Typography styles */
{chr(10).join(cls)}
"""
open(out,"w").write(css)
