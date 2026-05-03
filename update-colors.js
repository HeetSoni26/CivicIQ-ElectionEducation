const fs = require('fs');
const { join } = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.css')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let changed = false;
    
    if (f.endsWith('.css')) {
        if (content.match(/color:\s*white/g)) {
            content = content.replace(/color:\s*white/g, 'color: #C2B280');
            changed = true;
        }
    } else {
        if (content.match(/color:\s*"white"/g)) {
            content = content.replace(/color:\s*"white"/g, 'color: "#C2B280"');
            changed = true;
        }
        if (content.match(/color:\s*'white'/g)) {
            content = content.replace(/color:\s*'white'/g, "color: '#C2B280'");
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Updated', f);
    }
});
