function Eyes({ left = 49, right = 79, y = 63 }: { left?: number; right?: number; y?: number }) {
    return <g fill="#302a3b" stroke="none"><ellipse cx={left} cy={y} rx="3.5" ry="4.5" /><ellipse cx={right} cy={y} rx="3.5" ry="4.5" /><circle cx={left + 1} cy={y - 1.5} r="1.2" fill="#fff" /><circle cx={right + 1} cy={y - 1.5} r="1.2" fill="#fff" /></g>;
}

function AvatarArtwork({ id }: { id: string }) {
    switch (id) {
        case 'condor': return <>
            <path d="M21 94Q16 62 36 59L49 77 64 84 79 77 92 59Q112 63 107 94L87 103H41Z" fill="#49465b" />
            <path d="M29 85 39 96M99 85 89 96" fill="none" stroke="#78738c" />
            <path d="M43 75Q32 63 40 58Q40 48 50 52Q56 43 64 50Q72 43 78 52Q88 48 88 59Q97 64 85 76Q65 88 43 75Z" fill="#fffbef" />
            <path d="M47 54Q44 31 61 29Q82 27 81 52L78 65Q64 77 49 64Z" fill="#cd786b" />
            <path d="M56 32Q52 22 59 21L68 23Q76 20 74 30" fill="#a55360" />
            <path d="M56 59Q64 54 72 59L65 71Z" fill="#efba68" />
            <Eyes left={54} right={74} y={48} />
        </>;
        case 'llama': return <>
            <path d="M42 48Q24 7 37 14Q51 18 52 43M76 43Q78 15 91 14Q103 12 86 49" fill="#fff3d7" />
            <path d="M39 23 46 43M87 23 81 43" fill="none" stroke="#deab9a" strokeWidth="5" />
            <path d="M41 77 37 109H92L87 77" fill="#fff3d7" />
            <path d="M34 54Q31 42 43 40Q42 30 54 36Q63 26 72 36Q85 30 85 42Q98 44 94 57L89 77Q81 93 63 92Q45 93 38 77Z" fill="#fff3d7" />
            <ellipse cx="64" cy="76" rx="18" ry="14" fill="#eed2b5" stroke="none" />
            <Eyes y={59} />
            <path d="m59 73 5 4 5-4M64 77v5m-8 0q8 7 16 0" fill="none" />
            <path d="M38 97Q64 108 90 97L91 107Q64 118 37 107Z" fill="#c35c61" /><path d="m47 102 6 3 6-1m11 1 6-1 6-3" fill="none" stroke="#ffe9af" />
        </>;
        case 'colibri': return <>
            <path d="M46 82Q22 84 23 51Q37 54 50 70M47 91 36 112 62 99" fill="#537aa1" />
            <path d="M48 75Q43 58 52 42Q62 27 79 39Q89 44 87 59Q85 71 74 75L72 91Q60 108 44 94Z" fill="#319b91" />
            <path d="M76 56 114 53 84 64" fill="#554d69" />
            <path d="M55 74Q61 67 74 74L71 88Q63 96 53 90Z" fill="#be659d" stroke="none" />
            <path d="M38 87Q29 62 31 42Q53 56 56 82Z" fill="#64c4b6" />
            <path d="M35 54 44 79M34 66 42 84" fill="none" stroke="#328c86" />
            <circle cx="75" cy="49" r="4" fill="#302a3b" stroke="none" /><circle cx="76" cy="47.5" r="1.5" fill="#fff" stroke="none" />
            <path d="M58 39q5-8 11-5" fill="none" stroke="#a0e5c9" />
        </>;
        case 'zorro': return <>
            <path d="M30 56 23 23Q44 21 54 45M74 45Q86 22 105 23L97 59" fill="#d47a45" />
            <path d="m31 33 17 15-13 8m58-23-16 15 13 8" fill="#9b4e49" stroke="none" />
            <path d="M28 57Q39 40 64 42Q89 40 100 57L95 82Q78 104 64 105Q47 101 33 82Z" fill="#ed9756" />
            <path d="M30 62Q48 68 64 86Q80 68 98 62L94 82Q80 102 64 105Q45 99 34 82Z" fill="#fff3dc" />
            <Eyes left={46} right={82} y={63} />
            <path d="M57 83Q64 78 71 83L64 89Z" fill="#413546" /><path d="M64 90v5m-6-1q6 7 12 0" fill="none" />
            <circle cx="38" cy="77" r="4" fill="#f2b9a2" stroke="none" /><circle cx="90" cy="77" r="4" fill="#f2b9a2" stroke="none" />
        </>;
        case 'oso': return <>
            <circle cx="34" cy="40" r="15" fill="#514e61" /><circle cx="94" cy="40" r="15" fill="#514e61" /><circle cx="34" cy="40" r="8" fill="#b78f80" /><circle cx="94" cy="40" r="8" fill="#b78f80" />
            <path d="M27 64Q28 33 64 33Q100 33 101 64L98 88Q87 108 64 108Q41 108 30 88Z" fill="#514e61" />
            <path d="M37 58Q49 45 60 57Q64 62 68 57Q79 45 91 58L88 72Q78 82 68 70L64 66 60 70Q49 82 40 72Z" fill="#efdaa8" stroke="none" />
            <ellipse cx="64" cy="87" rx="21" ry="17" fill="#efdaa8" stroke="none" />
            <Eyes left={48} right={80} y={62} /><ellipse cx="64" cy="81" rx="8" ry="5" fill="#302a3b" stroke="none" /><path d="M64 87v6m-8-1q8 8 16 0" fill="none" />
        </>;
        case 'venado': return <>
            <path d="M48 43Q32 32 36 13m1 14-10-6m53 22q16-11 12-30m-1 14 10-6" fill="none" stroke="#956450" strokeWidth="5" />
            <path d="M42 53Q17 53 19 34Q36 30 47 45M82 53Q108 53 109 34Q93 29 80 45" fill="#bd8656" />
            <path d="m27 40 12 7m62-7-12 7" fill="none" stroke="#e9bea0" strokeWidth="5" />
            <path d="M38 64Q38 40 64 40Q90 40 90 64L86 89Q77 108 64 109Q50 108 42 89Z" fill="#d7a16c" />
            <path d="M48 84Q64 73 80 84L77 98Q64 114 51 98Z" fill="#fff0d8" stroke="none" />
            <Eyes left={49} right={79} y={65} /><ellipse cx="64" cy="85" rx="7" ry="5" fill="#4e3d42" stroke="none" /><path d="M64 90v5m-6 0q6 6 12 0" fill="none" />
            <g fill="#fff0d8" stroke="none"><ellipse cx="56" cy="50" rx="2" ry="3" /><ellipse cx="72" cy="50" rx="2" ry="3" /><ellipse cx="64" cy="55" rx="2" ry="3" /></g>
        </>;
        case 'tortuga': return <>
            <ellipse cx="34" cy="96" rx="12" ry="8" fill="#6ba58a" /><ellipse cx="79" cy="98" rx="12" ry="8" fill="#6ba58a" /><path d="m25 82-11 6 17 6" fill="#6ba58a" />
            <path d="M25 88Q20 48 57 46Q91 46 91 89Q60 104 25 88Z" fill="#488d7a" />
            <path d="m46 54 20-1 11 17-12 19-22-2-10-18Z" fill="#80b98a" /><path d="m46 54-5-6m25 5 5-4M77 70l13-2M65 89l4 8M43 87l-5 9M33 69l-9-2" fill="none" />
            <path d="M79 78Q75 58 89 52Q111 46 114 66Q119 88 98 94Q85 97 79 88Z" fill="#a3ce91" />
            <Eyes left={92} right={108} y={66} /><path d="M94 80q7 7 13-2" fill="none" /><circle cx="87" cy="77" r="3" fill="#e9b8a2" stroke="none" />
        </>;
        case 'rana': return <>
            <ellipse cx="64" cy="95" rx="32" ry="15" fill="#6ba56b" /><ellipse cx="33" cy="101" rx="13" ry="7" fill="#93c978" /><ellipse cx="95" cy="101" rx="13" ry="7" fill="#93c978" />
            <path d="M26 66Q26 42 64 43Q102 42 102 66L98 82Q90 100 64 100Q38 100 30 82Z" fill="#93c978" />
            <circle cx="42" cy="44" r="17" fill="#93c978" /><circle cx="86" cy="44" r="17" fill="#93c978" /><circle cx="42" cy="44" r="11" fill="#fff0bf" /><circle cx="86" cy="44" r="11" fill="#fff0bf" />
            <Eyes left={42} right={86} y={43} /><path d="M43 73q21 20 42 0" fill="none" strokeWidth="3" /><circle cx="36" cy="70" r="5" fill="#e6b49a" stroke="none" /><circle cx="92" cy="70" r="5" fill="#e6b49a" stroke="none" />
            <path d="M57 59h1m12 0h1" fill="none" stroke="#558254" strokeWidth="3" />
        </>;
        case 'mariposa': return <>
            <path d="M60 61Q41 19 21 30Q4 43 28 71Q10 91 29 102Q45 111 60 78M68 61Q87 19 107 30Q124 43 100 71Q118 91 99 102Q83 111 68 78" fill="#9e78b7" />
            <path d="M53 59Q33 34 25 40Q18 48 38 65ZM75 59Q95 34 103 40Q110 48 90 65Z" fill="#efacb9" stroke="none" />
            <path d="M53 78Q36 73 32 84Q29 96 45 92ZM75 78Q92 73 96 84Q99 96 83 92Z" fill="#87cec2" stroke="none" />
            <path d="M59 48q-9-15-15-12m25 12q9-15 15-12" fill="none" /><circle cx="44" cy="36" r="3" fill="#685079" /><circle cx="84" cy="36" r="3" fill="#685079" />
            <rect x="57" y="56" width="14" height="42" rx="7" fill="#685079" /><circle cx="64" cy="54" r="13" fill="#d8b4df" /><Eyes left={59} right={69} y={52} /><path d="M60 61q4 4 8 0" fill="none" />
        </>;
        case 'jaguar': return <>
            <circle cx="33" cy="40" r="16" fill="#e6b14f" /><circle cx="95" cy="40" r="16" fill="#e6b14f" /><circle cx="33" cy="40" r="8" fill="#b97758" /><circle cx="95" cy="40" r="8" fill="#b97758" />
            <path d="M26 67Q26 36 64 36Q102 36 102 67L96 91Q83 109 64 109Q45 109 32 91Z" fill="#efc064" />
            <path d="M39 82Q44 73 64 82Q84 73 89 82L85 98Q64 117 43 98Z" fill="#fff0cd" stroke="none" />
            <g fill="#8d654c" stroke="none"><ellipse cx="41" cy="52" rx="4" ry="3" /><ellipse cx="87" cy="52" rx="4" ry="3" /><ellipse cx="64" cy="45" rx="4" ry="3" /><ellipse cx="34" cy="71" rx="3" ry="4" /><ellipse cx="94" cy="71" rx="3" ry="4" /></g>
            <Eyes left={48} right={80} y={64} /><path d="m57 83 7 5 7-5Z" fill="#8f5a58" /><path d="M64 88v7m-9-1q9 9 18 0M38 83l-9-1m10 8-9 2m59-9 10-1m-10 8 9 2" fill="none" />
        </>;
        case 'mujer': return <>
            <path d="M35 55Q30 22 64 21Q98 22 93 57L94 91H34Z" fill="#454050" />
            <path d="M50 85h28q24 4 26 26H24q2-22 26-26Z" fill="#fcf1df" />
            <path d="M55 76h18v14q-9 12-18 0Z" fill="#c98d6d" />
            <ellipse cx="39" cy="59" rx="5" ry="8" fill="#dba383" /><ellipse cx="89" cy="59" rx="5" ry="8" fill="#dba383" />
            <path d="M40 46Q43 31 64 31Q86 31 88 46L85 65Q82 83 64 85Q46 83 43 65Z" fill="#dba383" />
            <path d="M39 49Q48 47 53 36Q62 47 89 48L87 36Q62 15 41 36Z" fill="#454050" />
            <Eyes left={51} right={77} y={55} />
            <path d="m63 59-2 7h5M55 72q9 8 18 0" fill="none" stroke="#925b54" />
            <circle cx="47" cy="65" r="4" fill="#e8a095" stroke="none" /><circle cx="81" cy="65" r="4" fill="#e8a095" stroke="none" />
            <circle cx="38" cy="69" r="3" fill="#edc16f" /><circle cx="90" cy="69" r="3" fill="#edc16f" />
            <path d="M38 75q-6 12 1 25m51-25q6 12-1 25" fill="none" stroke="#454050" strokeWidth="10" />
            <path d="m35 82 6 4-6 5 6 4m52-13-6 4 6 5-6 4" fill="none" stroke="#6e5c6a" strokeWidth="2" />
            <path d="M32 93 54 88 64 102 74 88 96 93 104 111H24Z" fill="#ac6285" />
            <path d="m35 98 16-4 13 15 13-15 16 4" fill="none" stroke="#f5d79f" strokeWidth="3" />
            <path d="m56 91 8 3 8-3" fill="none" stroke="#d5ad59" strokeWidth="3" />
        </>;
        case 'hombre': return <>
            <path d="M49 85h30q22 5 25 26H24q3-21 25-26Z" fill="#5d84ad" />
            <path d="M55 76h18v13l-9 9-9-9Z" fill="#bd8063" />
            <ellipse cx="38" cy="58" rx="5" ry="8" fill="#d39b78" /><ellipse cx="90" cy="58" rx="5" ry="8" fill="#d39b78" />
            <path d="M39 43Q42 28 64 28Q86 28 89 43L86 65Q81 84 64 86Q47 84 42 65Z" fill="#d39b78" />
            <path d="M38 53Q31 31 46 25Q50 18 59 22Q76 13 87 28Q98 33 90 53L84 43Q67 43 57 34Q49 46 40 45Z" fill="#454050" />
            <Eyes left={51} right={77} y={55} />
            <path d="m63 59-2 7h5M55 72q9 8 18 0" fill="none" stroke="#8b5851" />
            <circle cx="47" cy="65" r="3.5" fill="#df9d88" stroke="none" /><circle cx="81" cy="65" r="3.5" fill="#df9d88" stroke="none" />
            <path d="m48 88 16 12 16-12M64 100v11" fill="none" stroke="#d4e6ee" strokeWidth="3" />
            <path d="M29 102h70v8H25Z" fill="#eacb91" />
            <path d="m38 106 5-3 5 3-5 3Zm16 0 5-3 5 3-5 3Zm16 0 5-3 5 3-5 3Zm16 0 5-3 5 3-5 3Z" fill="#95718b" stroke="none" />
        </>;
        default: return null;
    }
}

export function AvatarIllustration({ id, background }: { id: string; background: string }) {
    return <svg className="avatar-illustration" viewBox="0 0 128 128" fill="none" aria-hidden="true" focusable="false">
        <rect width="128" height="128" rx="30" fill={background} />
        <circle cx="64" cy="62" r="48" fill="#fff" fillOpacity=".35" />
        <path d="m18 29 3-6 3 6-3 6Zm88 53 3-6 3 6-3 6Z" fill="#fff" fillOpacity=".8" />
        <ellipse cx="64" cy="110" rx="33" ry="5" fill="#4b3e58" fillOpacity=".1" />
        <g stroke="#494050" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><AvatarArtwork id={id} /></g>
        <path d="m52 120 4-3 4 3-4 3Zm12 0 4-3 4 3-4 3Z" fill="#6d5c7f" fillOpacity=".35" />
    </svg>;
}
