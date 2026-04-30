import codecs

log_path = r'C:\Users\4-410-33\.gemini\antigravity\brain\4815b855-cc91-445f-8684-13b523e5afbf\.system_generated\logs\overview.txt'
with codecs.open(log_path, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

html_lines = []
in_block = False
for line in lines:
    if 'File Path:' in line and 'index.html' in line:
        in_block = True
        html_lines = []
        continue
    if in_block:
        if 'The above content shows the entire' in line or 'The above content shows a chunk' in line:
            in_block = False
            continue
        if ':' in line:
            parts = line.split(':', 1)
            if parts[0].strip().isdigit():
                html_lines.append(parts[1][1:]) # Remove leading space
            else:
                if len(html_lines) > 10:
                    continue
        
with codecs.open(r'c:\Users\4-410-33\Downloads\MyHome-main\index-backup.html', 'w', encoding='utf-8') as out:
    out.writelines(html_lines)
print(f'Recovered {len(html_lines)} lines to index-backup.html')
