export const practiceColors: Record<string, { hex: string; meaning: string }> = {
    yurak: { hex: '#ffffff', meaning: 'Blanco' }, yana: { hex: '#202124', meaning: 'Negro' },
    puka: { hex: '#df343d', meaning: 'Rojo' }, killu: { hex: '#f7ce28', meaning: 'Amarillo' },
    ankas: { hex: '#1575d1', meaning: 'Azul' }, waylla: { hex: '#319647', meaning: 'Verde' },
    paku: { hex: '#88562e', meaning: 'Marrón' }, maywa: { hex: '#8b3abe', meaning: 'Morado' },
    kishpu: { hex: '#ff8b24', meaning: 'Naranja' }, waminsi: { hex: '#f079ad', meaning: 'Rosado' },
    suku: { hex: '#929aa0', meaning: 'Gris' },
};
const objects: Record<string, string> = { cup: 'Taza', notebook: 'Cuaderno', bag: 'Bolsa', hat: 'Sombrero', cat: 'Gato', pants: 'Pantalón', shawl: 'Reboso', necklace: 'Collar', shoes: 'Zapatos' };

export function ColorObjectVisual({ object, color }: { object: string; color?: string }) {
    const fill = practiceColors[color ?? '']?.hex ?? '#d5d9df';
    return <svg className="color-object" viewBox="0 0 160 115" role="img" aria-label={`${objects[object] ?? 'Objeto'}${color ? ` de color ${practiceColors[color]?.meaning.toLowerCase() ?? color}` : ' para colorear'}`}>
        <ellipse cx="80" cy="104" rx="49" ry="5" fill="currentColor" opacity=".08"/>
        <g fill={fill} stroke="#535563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {object === 'cup' && <><path d="M107 35h12c25 0 25 39-2 39h-11V63h9c12 0 13-17 1-17h-9"/><path d="M42 27h68l-6 65c-10 13-47 13-57 0Z"/><ellipse cx="76" cy="27" rx="34" ry="10" fill="#f1f1ee"/><ellipse cx="76" cy="28" rx="26" ry="5" fill="#7b7c80"/><path d="M49 39v44" stroke="#ffffff" strokeOpacity=".5" strokeWidth="5"/></>}
            {object === 'notebook' && <><path d="m43 16 77 3-5 83-78-3Z"/><path d="m47 17-4 81" strokeWidth="5"/><path d="m56 34 49 2m-50 12 49 2m-50 12 49 2m-50 12 49 2m-50 12 49 2" stroke="#ffffff" strokeOpacity=".65"/>{[25,39,53,67,81,94].map(y=><path key={y} d={`M37 ${y}q-10-5-10 2t10 4`} fill="none"/>)}</>}
            {object === 'bag' && <><path d="M52 41V30c0-34 53-34 53 0v11H94V29c0-20-31-20-31 0v12" fill="#e8d6bb"/><path d="m38 39 85 1 9 60H30Z"/><path d="m43 46-6 45m79-45 8 45" fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="4"/><path d="M40 94h82" fill="none" strokeOpacity=".3"/></>}
            {object === 'hat' && <><ellipse cx="81" cy="85" rx="65" ry="17"/><path d="m43 80 8-49q28-25 57 0l11 49q-36 20-76 0Z"/><path d="m46 65-3 15q40 20 76 0l-3-15q-34 19-70 0" fill="#30323b"/><path d="M62 36q17-10 34-1" fill="none" stroke="#ffffff" strokeOpacity=".6" strokeWidth="5"/></>}
            {object === 'cat' && <><path d="M110 84q31 14 22-29-6-11-11-2 15 41-15 33"/><ellipse cx="80" cy="78" rx="29" ry="25"/><path d="m53 34-6-24 26 13h15l24-13-4 25c19 37-65 44-55-1Z"/><path d="m51 20 4 16 10-8m38-9-5 16-8-6" fill="#e9aeb0" stroke="none"/><path d="m62 41 7 1m22-1 7-1" stroke="#537c45" strokeWidth="5"/><path d="m77 49 5 4 5-4" fill="#c07b80"/><path d="m82 53-1 7m-28-8-16-2m17 8-16 5m67-12 16-2m-17 8 17 6" fill="none"/><path d="M67 82v17m27-17v17" fill="none"/><ellipse cx="65" cy="101" rx="12" ry="4"/><ellipse cx="96" cy="101" rx="12" ry="4"/></>}
            {object === 'pants' && <><path d="M49 12h64l-4 89H84l-5-58-7 58H46Z"/><path d="M50 25h61M80 15v26m-28-9 13 9m41-9-13 9M48 94h23m14 0h22" fill="none" strokeOpacity=".45"/><circle cx="82" cy="19" r="2" fill="#dfd6a9"/></>}
            {object === 'shawl' && <><path d="m39 18 78 4-5 70-37-14-37 14Z"/><path d="m39 20 35 48 43-45-42 55" fill="none" strokeOpacity=".4"/>{[40,47,54,61,68,88,95,102,109].map(x=><path key={x} d={`m${x} ${x<75?91-(x-40)*.35:80+(x-88)*.35}v12`} stroke={fill} strokeWidth="3"/>)}</>}
            {object === 'necklace' && <><path d="M57 17c-65 80 107 117 48 0" fill="none" stroke="#777984"/>{Array.from({length:15},(_,i)=>{const a=(i/14)*Math.PI;return <circle key={i} cx={80-46*Math.cos(a)} cy={24+67*Math.sin(a)} r={i===7?8:6}/>})}<path d="m73 96 7 8 8-8-8-7Z"/></>}
            {object === 'shoes' && <><path d="M34 30 59 16l21 34 21 4q20 3 14 22H21q-9-14 13-46Z"/><path d="M20 70h97v10H20Z" fill="#f4f2eb"/><path d="m38 59 20-8m-15-2 15-9m-8 0 10-6" stroke="#f4f2eb" strokeWidth="4"/><path d="m58 57 27-18 18 31 28 6q17 4 12 22H48q-7-16 10-41Z"/><path d="M48 94h96v9H48Z" fill="#f4f2eb"/><path d="m65 83 19-8m-14-3 14-9m-8 0 9-6" stroke="#f4f2eb" strokeWidth="4"/></>}
        </g>
        <path d="M22 107H139" stroke="currentColor" opacity=".06"/>
    </svg>;
}
