import type { CSSProperties } from 'react';
import {
    Bed, Bird, BookOpen, BriefcaseBusiness, BrushCleaning, Calculator, CalendarDays, CalendarRange,
    Cat, Clock3, CloudRain, CookingPot, CupSoda, Dog, DoorOpen, Droplets, Ear, Eye, Footprints,
    Hand, Hash, House, Layers, Leaf, MessageCircle, Moon, Mountain, Rat, Palette, PanelsTopLeft,
    PawPrint, PenLine, PersonStanding, Quote, Rabbit, Shirt, Smile, Split, Sprout, Sun,
    TreeDeciduous, UserRound, UsersRound, Utensils, Wind, type LucideIcon,
} from 'lucide-react';

const sectionIcons: Record<string, readonly LucideIcon[]> = {
    pronouns: [UserRound, UsersRound, MessageCircle, Quote],
    numbers: [Hash, Calculator, Layers, Leaf],
    calendar: [CalendarDays, CalendarRange, Clock3, Sun],
    'animals-colors': [PawPrint, Bird, Palette, Shirt],
    body: [Smile, Hand, PersonStanding, Footprints],
    nature: [Mountain, House, Moon, CloudRain],
    verbs: [Footprints, BookOpen, Split, Utensils],
};

const animalIcons: Record<string, LucideIcon> = {
    allku: Dog, misi: Cat, kuy: PawPrint, llama: PawPrint, wakra: PawPrint, kuchi: PawPrint,
    atalpa: Bird, kunu: Rabbit, apiw: PawPrint, chantasu: PawPrint, taruka: PawPrint,
    ukucha: Rat, urpi: Bird, kinti: Bird,
};
const natureIcons: Record<string, LucideIcon> = {
    inti: Sun, killa: Moon, yaku: Droplets, allpa: Sprout, wayra: Wind, urku: Mountain,
    tamya: CloudRain, wasi: House, yura: TreeDeciduous, punku: DoorOpen, tuku: PanelsTopLeft,
};
const actionIcons: Record<string, LucideIcon> = {
    mikuna: Utensils, upyana: CupSoda, puñuna: Bed, purina: Footprints, killkana: PenLine,
    pichana: BrushCleaning, yachana: BookOpen, llamkana: BriefcaseBusiness, yanuna: CookingPot,
    tarpuna: Sprout, rikuna: Eye, uyana: Ear,
};
const colors: Record<string, string> = {
    yurak: '#fffdf5', yana: '#282823', puka: '#bb4038', killu: '#e6bd3f', ankas: '#4777af',
    waylla: '#65834b', paku: '#8b6246', maywa: '#866198', kishpu: '#dd8840', waminsi: '#d991a7', suku: '#8b8f8a',
};

export function TopicSectionIcon({ lesson, section }: { lesson: string; section: number }) {
    const Icon = sectionIcons[lesson]?.[section];
    return Icon ? <span className="topic-section-icon" aria-hidden="true"><Icon size={23} strokeWidth={1.6} /></span> : null;
}

export function TopicWordVisual({ lesson, section, word, index }: { lesson: string; section: number; word: string; index: number }) {
    if (lesson === 'animals-colors' && (word === 'pilpintu' || word === 'hampatu')) {
        return <svg className="topic-word-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {word === 'pilpintu' ? <>
                <path d="M12 8v12M12 8 9 4m3 4 3-4M12 10C6 1 1 5 3 11c1 3 5 3 9 3C5 11 3 17 6 20c3 3 5-1 6-4M12 10c6-9 11-5 9 1-1 3-5 3-9 3 7-3 9 3 6 6-3 3-5-1-6-4" />
            </> : <>
                <circle cx="8" cy="7" r="3" /><circle cx="16" cy="7" r="3" />
                <path d="M5 9c-3 3-2 8 2 10h10c4-2 5-7 2-10M8 7h.01M16 7h.01M8 13c2 2 6 2 8 0M7 19l-4 2m14-2 4 2" />
            </>}
        </svg>;
    }
    if (lesson === 'animals-colors' && section === 2 && colors[word]) {
        return <span className="topic-color-swatch" style={{ '--topic-swatch': colors[word] } as CSSProperties} aria-hidden="true" />;
    }
    if (lesson === 'calendar' && section === 1) {
        return <span className="topic-month-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>;
    }
    const Icon = lesson === 'animals-colors' ? animalIcons[word] : lesson === 'nature' ? natureIcons[word] : lesson === 'verbs' ? actionIcons[word] : undefined;
    return Icon ? <Icon className="topic-word-icon" size={19} strokeWidth={1.65} aria-hidden="true" /> : null;
}
