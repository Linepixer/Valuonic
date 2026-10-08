import os
import re

dir_path = r'frontend/src/components'
for filename in os.listdir(dir_path):
    if not filename.endswith('.jsx'): continue
    filepath = os.path.join(dir_path, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    def repl(m):
        handler = m.group(1)
        handler_code = handler[1:-1]
        return '<div className="modal-overlay" onMouseDown={(e) => { if (e.target.className === "modal-overlay") { (' + handler_code + ')(e); } }}'

    new_content = re.sub(r'<div className="modal-overlay" onClick=(\{.*?\})', repl, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filename}')
