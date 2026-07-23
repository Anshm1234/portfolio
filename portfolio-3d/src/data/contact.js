// Shared contact constants for the Contact section.
export const EMAIL = 'anshmadaanmks@gmail.com';

// Gmail compose in a new tab with the outreach pre-typed. (A plain mailto:
// silently does nothing on machines without a desktop mail app configured —
// most Windows setups — so we open webmail instead.)
export const COMPOSE =
  'https://mail.google.com/mail/?view=cm&fs=1' +
  `&to=${EMAIL}` +
  `&su=${encodeURIComponent("Let's Work together")}` +
  `&body=${encodeURIComponent('I saw your Portfolio, lets work together')}`;

export const SOCIALS = {
  linkedin: 'https://www.linkedin.com/in/ansh-madaan-5362b92a8/',
  github: 'https://github.com/Anshm1234',
  instagram: 'https://www.instagram.com/ansh_maddaaaannn/',
  email: COMPOSE,
};
