const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  /<Link to={`\/live\/\${live\.slug}`} target="_blank"/,
  `<Link to={\`/painel/lives/\${live.id}\`} className="flex-1 flex justify-center items-center space-x-2 bg-[#FF5A36] hover:bg-[#e04825] text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                  <Edit className="w-4 h-4" />
                  <span>Editar</span>
                </Link>
                <Link to={\`/live/\${live.slug}\`} target="_blank"`
);

// We need to import Edit if not imported
if (!code.includes('Edit')) {
  code = code.replace(/import { (.*) } from "lucide-react";/, 'import { $1, Edit } from "lucide-react";');
}

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log('Updated Dashboard');
