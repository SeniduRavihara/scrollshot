// A single-page PDF with a JPEG image, built locally without remote libraries.
export function imagePdf(jpeg,width,height){
 const enc=new TextEncoder(),parts=[],offsets=[0];let length=0;
 const add=v=>{const b=typeof v==='string'?enc.encode(v):v;parts.push(b);length+=b.length;};
 const object=(id,content)=>{offsets[id]=length;add(`${id} 0 obj\n${content}\nendobj\n`);};
 const factor=Math.min(1,14000/Math.max(width,height)),w=+(width*factor).toFixed(3),h=+(height*factor).toFixed(3);
 add('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');object(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
 offsets[4]=length;add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);add(jpeg);add('\nendstream\nendobj\n');
 const content=`q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ\n`;object(5,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);
 const xref=length;add('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)add(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(parts,{type:'application/pdf'});
}
