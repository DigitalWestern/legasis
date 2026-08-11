/**
 * Everything Haley is likely to want changed, in one file.
 * Edit here — the components read from it.
 */

export const label = {
  name: 'Legasis',
  full: 'Legasis Records',
  established: '2026',
  // shown in the top bar as a live clock. IANA timezone name.
  city: 'Los Angeles',
  timezone: 'America/Los_Angeles',
  email: 'demos@legasisrecords.com',
  socials: [
    { name: 'Instagram', short: 'IG', href: '#' },
    { name: 'Spotify', short: 'SP', href: '#' },
    { name: 'SoundCloud', short: 'SC', href: '#' },
    { name: 'Bandcamp', short: 'BC', href: '#' },
  ],
};

export const nav = [
  { label: 'The Label', href: '#label', seed: 'label' },
  { label: 'Artists', href: '#artists', seed: 'artists' },
  { label: 'Releases', href: '#releases', seed: 'releases' },
  { label: 'What We Do', href: '#services', seed: 'services' },
  { label: 'Contact', href: '#contact', seed: 'contact' },
];

/**
 * Roster slots. Deliberately unfilled — a new label with five open slots reads
 * as intent, not as a missing database. Fill `name`/`src` as artists sign.
 */
export const roster = [
  { id: 'A-01', name: null, note: 'Slot open' },
  { id: 'A-02', name: null, note: 'Slot open' },
  { id: 'A-03', name: null, note: 'Slot open' },
  { id: 'A-04', name: null, note: 'In conversation' },
  { id: 'A-05', name: null, note: 'Slot open' },
];

/**
 * Catalogue. Real labels number their releases from the first one, so the
 * numbering here is the actual catalogue system rather than decoration.
 */
export const catalogue = [
  { cat: 'LGS-001', title: 'Untitled', artist: 'TBA', format: 'Single', status: 'In production' },
  { cat: 'LGS-002', title: 'Untitled', artist: 'TBA', format: 'EP', status: 'Scheduled' },
  { cat: 'LGS-003', title: 'Untitled', artist: 'TBA', format: 'Single', status: 'Scheduled' },
  { cat: 'LGS-004', title: 'Untitled', artist: 'TBA', format: 'LP', status: 'Planned' },
  { cat: 'LGS-005', title: 'Untitled', artist: 'TBA', format: 'Single', status: 'Planned' },
];

/** What the label actually does for an artist. */
export const services = [
  'A&R',
  'Recording',
  'Mixing',
  'Mastering',
  'Publishing',
  'Sync Licensing',
  'Distribution',
  'Rights Management',
  'Creative Direction',
  'Vinyl Pressing',
  'Press & Radio',
  'Royalty Accounting',
];
