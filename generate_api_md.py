import os
import glob
import re

output = "# Buzzer Backend API Endpoints\n\n"
output += "Below is the list of all API endpoints and the files where they are defined:\n\n"

route_dir = "app/routes"
files = glob.glob(os.path.join(route_dir, "*.py"))

for file in files:
    filename = os.path.basename(file)
    if filename == "__init__.py":
        continue
        
    output += f"## {filename}\n"
    
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find all @bp.route('/path', methods=[...])
    matches = re.findall(r'@\w+\.route\([\'"]([^\'"]+)[\'"](?:,\s*methods=\[([^\]]+)\])?', content)
    
    if not matches:
        output += "- No routes found.\n\n"
        continue
        
    for path, methods_str in matches:
        if methods_str:
            # clean up methods string
            methods = [m.strip(" '\"") for m in methods_str.split(',')]
            methods_formatted = ", ".join(methods)
        else:
            methods_formatted = "GET" # Default in flask
            
        output += f"- **[{methods_formatted}]** {path}\n"
    
    output += "\n"

with open("api.md", "w", encoding="utf-8") as f:
    f.write(output)
    
print("api.md generated successfully!")
