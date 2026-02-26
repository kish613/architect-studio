const fs = require('fs');
const file = '/Users/kivateit/Documents/GitHub/architect-studio/client/src/pages/PlanningViewer.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. imports
content = content.replace(
  `import { Layout } from "@/components/layout/Layout";`,
  `import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";`
);

// 2. ExtendProgressIndicator styling
content = content.replace(
  /className="py-12 dark-glass-card rounded-2xl border-primary\/20"/g,
  'className="py-12 weavy-panel rounded-2xl border-primary/20"'
);

// 3. authLoading Layout replace
content = content.replace(
  /<Layout>\s*<div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-\[60vh\]">\s*<div className="text-center">\s*<Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" \/>\s*<p className="text-muted-foreground">Loading analysis...<\/p>\s*<\/div>\s*<\/div>\s*<\/Layout>/g,
  `<WorkspaceLayout title="Loading..."><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></WorkspaceLayout>`
);

// 4. error Layout replace
content = content.replace(
  /<Layout>\s*<div className="container mx-auto px-4 py-12 max-w-2xl">([\s\S]*?)<\/Layout>/g,
  `<WorkspaceLayout title="Error" onBack={() => setLocation("/planning")}><div className="max-w-2xl mx-auto w-full">$1</div></WorkspaceLayout>`
);

// Save back
fs.writeFileSync(file, content);
console.log('Phase 1 done');
