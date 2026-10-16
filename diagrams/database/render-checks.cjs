async (page) => {
  await page.evaluate(() => document.fonts.ready);
  const diagnostics = await page.evaluate(() => {
    const issues = [];
    const counts = {};
    for (const svg of document.querySelectorAll("main svg")) {
      const nodes = [...svg.querySelectorAll(".entity")];
      const scopeIssues = [];
      for (const node of nodes) {
        const x = Number(node.dataset.x), y = Number(node.dataset.y);
        const w = Number(node.dataset.w), h = Number(node.dataset.h);
        for (const t of node.querySelectorAll("text")) {
          const b = t.getBBox();
          if (b.x < x + 8 || b.x + b.width > x + w - 8 ||
              b.y < y + 4 || b.y + b.height > y + h - 4)
            scopeIssues.push({type:"text-outside-node",node:node.dataset.name,text:t.textContent});
        }
        for (const row of node.querySelectorAll(".field")) {
          const texts = row.querySelectorAll("text");
          const a = texts[0].getBBox(), b = texts[1].getBBox();
          if (a.x + a.width + 8 > b.x)
            scopeIssues.push({type:"field-columns-overlap",node:node.dataset.name,left:texts[0].textContent,right:texts[1].textContent});
        }
      }
      for (const domain of svg.querySelectorAll(".domain")) {
        const domainNodes = [...domain.querySelectorAll(".entity")].map(n=>({
          name:n.dataset.name,x:+n.dataset.x,y:+n.dataset.y,w:+n.dataset.w,h:+n.dataset.h
        }));
        const rectangles = [...domain.querySelectorAll('.edge-label rect')].map(r=>({
          x:+r.getAttribute('x'),y:+r.getAttribute('y'),w:+r.getAttribute('width'),h:+r.getAttribute('height')
        }));
        const overlaps = (a,b) => a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
        for (let i=0;i<rectangles.length;i++) {
          if(domainNodes.some(n=>overlaps(rectangles[i],n))) scopeIssues.push({type:'label-over-node',domain:domain.dataset.domain});
          for(let j=i+1;j<rectangles.length;j++)
            if(overlaps(rectangles[i],rectangles[j])) scopeIssues.push({type:'label-over-label',domain:domain.dataset.domain});
        }
        for (const edge of domain.querySelectorAll(".relationship")) {
          const segments = [...edge.querySelector("path").getAttribute("d").matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>({x:+m[1],y:+m[2]}));
          for (let i=1;i<segments.length;i++) {
            const a=segments[i-1],b=segments[i];
            for (const n of domainNodes) {
              if (n.name===edge.dataset.parent||n.name===edge.dataset.child) continue;
              const crosses = a.y===b.y ?
                a.y>n.y+1&&a.y<n.y+n.h-1&&Math.max(a.x,b.x)>n.x+1&&Math.min(a.x,b.x)<n.x+n.w-1 :
                a.x>n.x+1&&a.x<n.x+n.w-1&&Math.max(a.y,b.y)>n.y+1&&Math.min(a.y,b.y)<n.y+n.h-1;
              if(crosses)scopeIssues.push({type:"edge-crosses-node",domain:domain.dataset.domain,parent:edge.dataset.parent,child:edge.dataset.child,node:n.name});
            }
          }
        }
      }
      counts[svg.id] = {domains:svg.querySelectorAll(".domain").length,entities:nodes.length,issues:scopeIssues.length};
      issues.push(...scopeIssues);
    }
    return {counts,issues,fonts:{geist:document.fonts.check('20px "Geist"'),mono:document.fonts.check('12px "Geist Mono"'),serif:document.fonts.check('40px "Instrument Serif"')},pixelRatio:devicePixelRatio};
  });
  console.log(JSON.stringify(diagnostics));
  await page.locator("#mcd").screenshot({ path: "C:/Users/khali/Desktop/HVA/03 - PROJECTS/CUSTOM PROJECTS/Kayrealestate/diagrams/database/kay-mcd.png", scale: "device" });
  await page.locator("#mld").screenshot({ path: "C:/Users/khali/Desktop/HVA/03 - PROJECTS/CUSTOM PROJECTS/Kayrealestate/diagrams/database/kay-mld.png", scale: "device" });
  const details = "C:/Users/khali/Desktop/HVA/03 - PROJECTS/CUSTOM PROJECTS/Kayrealestate/diagrams/database/details/";
  for (const [model, count] of [['mcd',7],['mld',11]]) {
    for(let i=1;i<=count;i++)
      await page.locator('#'+model+'-domain-'+i).screenshot({path:details+model+'-'+String(i).padStart(2,'0')+'.png',scale:'device'});
  }
  await page.locator("#mcd-domain-2").screenshot({ path: "C:/Users/khali/Desktop/HVA/03 - PROJECTS/CUSTOM PROJECTS/Kayrealestate/output/playwright/kay-diagrams/mcd-inventory.png", scale: "device" });
  await page.locator("#mld-domain-7").screenshot({ path: "C:/Users/khali/Desktop/HVA/03 - PROJECTS/CUSTOM PROJECTS/Kayrealestate/output/playwright/kay-diagrams/mld-scheduling.png", scale: "device" });
  return diagnostics;
}
