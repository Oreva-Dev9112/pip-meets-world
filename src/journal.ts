interface Entry {
  day: number;
  text: string;
  place: string | null;
  dot: string | null;
  /** The name the dot went by when this was written, so early entries keep saying "the blue one". */
  dotName?: string;
  fresh: boolean;
}

export interface JournalLinks {
  placeName(id: string): string;
  showPlace(id: string): void;
  dotName(id: string): string;
}

/** The notebook beside the map. Newest first, grouped by day, with tappable names. */
export class Journal {
  private readonly entries: Entry[] = [];
  private filter: string | null = null;

  constructor(private readonly list: HTMLElement, private readonly chip: HTMLButtonElement, private readonly links: JournalLinks) {
    chip.addEventListener('click', () => { this.filter = null; this.render(); });
  }

  write(day: number, text: string, place: string | null = null): void {
    this.entries.push({ day, text, place, dot: null, fresh: true });
    this.render();
  }

  writeAbout(day: number, text: string, dot: string, place: string | null = null): void {
    this.entries.push({ day, text, place, dot, dotName: this.links.dotName(dot), fresh: true });
    this.render();
  }

  private render(): void {
    const { list, chip, links } = this;
    list.textContent = '';
    const shown = this.entries.filter((e) => !this.filter || e.dot === this.filter).slice().reverse();
    let lastDay: number | null = null;
    for (const e of shown) {
      if (e.day !== lastDay) {
        const d = document.createElement('li');
        d.className = 'day';
        d.textContent = 'Day ' + e.day;
        list.appendChild(d);
        lastDay = e.day;
      }
      const li = document.createElement('li'), p = document.createElement('p');
      p.className = 'entry' + (e.fresh ? ' new' : '');
      e.fresh = false;
      for (const part of e.text.split(/(@P|@D)/)) {
        if (part === '@P' && e.place) {
          const id = e.place;
          p.appendChild(link(links.placeName(id), () => links.showPlace(id)));
        } else if (part === '@D' && e.dot) {
          const id = e.dot;
          p.appendChild(link(e.dotName ?? id, () => { this.filter = id; this.render(); }));
        } else if (part) p.appendChild(document.createTextNode(part));
      }
      li.appendChild(p);
      list.appendChild(li);
    }
    chip.hidden = !this.filter;
    if (this.filter) chip.textContent = 'Everything about ' + links.dotName(this.filter) + '  ✕';
  }
}

function link(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'link';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}
