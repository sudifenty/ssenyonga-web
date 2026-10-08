#!/usr/bin/env node
/* ============================================================================
   Static SEO page generator for Cars for Sale in Uganda
   ----------------------------------------------------------------------------
   The website itself is one JavaScript-rendered page (index.html), which search
   engines index poorly and which has no per-car URLs to link to. This script
   reads the live inventory out of Supabase and writes REAL HTML files that
   Google can crawl:

       /cars/<id>/index.html        one page per car, full details + photos
       /<landing-slug>/index.html   keyword landing pages (model + location)
       /sitemap.xml                 every generated URL, with lastmod
       /robots.txt                  points crawlers at the sitemap

   index.html at the root is never touched - it stays the live app.

   Run:  node build.mjs
   ========================================================================== */

import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SITE = 'https://www.ssenyonga-motors.online';
const SUPABASE_URL = 'https://araestfegjfgbpiuqiay.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y_jcJfz8cP3hUP794i8dtQ_9XPbgnAt';
const PHONE_DISPLAY = '0753 825 453';
const PHONE_TEL = '+256753825453';
const WA_NUMBER = '256753825453';
const BRAND = 'Cars for Sale in Uganda';
const ADDRESS = 'Lumumba Avenue, Nakasero — Kampala';
const ROOT = path.resolve('.');

/* ---------------------------------------------------------------- helpers */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (n) => Number(n) > 0
  ? 'UGX ' + Number(n).toLocaleString('en-US')
  : 'Price on request';

const miles = (n) => Number(n) > 0 ? Number(n).toLocaleString('en-US') + ' km' : '—';

const isSold = (c) => c.status === 'sold' || c.sold === true;

const slugify = (s) => String(s).toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

const waLink = (car) => 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(
  car
    ? `Hi! I am interested in the ${car.name} (${money(car.price)}) on ${BRAND}. Is it still available?`
    : `Hi! I would like to ask about the cars on ${BRAND}.`);

/* ------------------------------------------------------------ page shell */
function page({ title, description, canonical, h1, intro, body, jsonld }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="${esc(BRAND)}">
<meta name="theme-color" content="#111111">
<style>
*,::before,::after{box-sizing:border-box}
body{margin:0;background:#111;color:#eee;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.6}
a{color:#D4AF37;text-decoration:none}
a:hover{text-decoration:underline}
img{display:block;max-width:100%}
.wrap{max-width:1120px;margin:0 auto;padding:0 1rem}
header{border-bottom:1px solid #262626;background:rgba(17,17,17,.95);position:sticky;top:0;z-index:10;backdrop-filter:blur(6px)}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:1rem;padding:.85rem 0}
.brand{font-weight:800;font-size:1.05rem;color:#fff}
.brand b{color:#D4AF37;font-weight:800}
.cta{margin-left:auto;display:flex;gap:.5rem;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:.4rem;border-radius:.7rem;padding:.5rem .9rem;font-size:.85rem;font-weight:700;border:1px solid #2f2f2f;background:#181818;color:#eee}
.btn:hover{border-color:#D4AF37;text-decoration:none}
.btn-g{background:#25D366;border-color:#25D366;color:#06231a}
.btn-a{background:#D4AF37;border-color:#D4AF37;color:#1a1400}
h1{font-size:1.9rem;line-height:1.2;margin:1.6rem 0 .4rem;color:#fff}
h2{font-size:1.2rem;margin:2rem 0 .6rem;color:#fff}
.lede{color:#aaa;max-width:60rem;margin:0 0 1.2rem}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));margin:1.2rem 0 2rem}
.card{border:1px solid #262626;background:#1a1a1a;border-radius:1rem;overflow:hidden;display:flex;flex-direction:column}
.card:hover{border-color:rgba(212,175,55,.55)}
.card img{height:170px;width:100%;object-fit:cover;background:#222}
.card .in{padding:.85rem 1rem 1rem}
.card h3{margin:0 0 .2rem;font-size:1rem;color:#fff}
.card .mi{color:#999;font-size:.8rem;margin:0}
.card .pr{color:#D4AF37;font-weight:800;font-size:1.15rem;margin:.5rem 0 0}
.sold .pr{color:#8a8a8a;text-decoration:line-through}
.sold img{filter:grayscale(.85) brightness(.55)}
.tag{display:inline-block;background:#dc2626;color:#fff;font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:.15rem .5rem;border-radius:.4rem;margin-bottom:.35rem}
.gal{display:grid;gap:.6rem;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));margin:1rem 0}
.gal img{border-radius:.6rem;border:1px solid #262626;aspect-ratio:4/3;object-fit:cover;width:100%}
.hero{border-radius:1rem;border:1px solid #262626;width:100%;max-height:460px;object-fit:cover}
.spec{border-collapse:collapse;width:100%;max-width:34rem;margin:1rem 0}
.spec th,.spec td{text-align:left;padding:.5rem .7rem;border-bottom:1px solid #222;font-size:.92rem}
.spec th{color:#888;font-weight:600;width:11rem}
.price-big{font-size:2rem;font-weight:800;color:#D4AF37;margin:.6rem 0}
.sold-big{font-size:2rem;font-weight:800;color:#8a8a8a;text-decoration:line-through;margin:.6rem 0}
.crumb{font-size:.82rem;color:#777;margin:1rem 0 0}
.crumb a{color:#999}
.desc{white-space:pre-line;color:#ccc;max-width:48rem}
.links{display:flex;flex-wrap:wrap;gap:.5rem .9rem;margin:.6rem 0 0;font-size:.88rem}
footer{border-top:1px solid #262626;margin-top:3rem;padding:1.8rem 0;color:#777;font-size:.85rem}
footer a{color:#bbb}
.note{color:#aaa;background:#181818;border:1px solid #262626;border-radius:.8rem;padding:.9rem 1.1rem;max-width:48rem}
</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
<header><div class="wrap bar">
  <a class="brand" href="${SITE}/">Cars for Sale in <b>Uganda</b></a>
  <div class="cta">
    <a class="btn btn-a" href="tel:${PHONE_TEL}">Call ${PHONE_DISPLAY}</a>
    <a class="btn btn-g" href="${waLink(null)}" rel="noopener" target="_blank">WhatsApp</a>
  </div>
</div></header>
<main class="wrap">
<h1>${h1}</h1>
${intro ? `<p class="lede">${intro}</p>` : ''}
${body}
</main>
<footer><div class="wrap">
  <p><strong style="color:#fff">${esc(BRAND)}</strong> — ${esc(ADDRESS)}<br>
  Call or WhatsApp: <a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a></p>
  <p><a href="${SITE}/">Browse all cars</a> · <a href="${SITE}/cars-for-sale-in-uganda/">Cars for sale in Uganda</a> · <a href="${SITE}/cars-for-sale-in-kampala/">Cars in Kampala</a></p>
  <p>&copy; ${new Date().getFullYear()} ${esc(BRAND)}. All rights reserved.</p>
</div></footer>
</body>
</html>`;
}

/* -------------------------------------------------------------- car card */
function card(c) {
  const img = (c.images || [])[0] || '';
  const sold = isSold(c);
  return `<a class="card${sold ? ' sold' : ''}" href="${SITE}/cars/${esc(c.id)}/">
  ${img ? `<img src="${esc(img)}" alt="${esc(c.name)} for sale in Uganda" loading="lazy" width="400" height="300">` : ''}
  <div class="in">
    ${sold ? '<span class="tag">Sold</span>' : ''}
    <h3>${esc(c.name)}</h3>
    <p class="mi">${c.year ? esc(c.year) + ' · ' : ''}${miles(c.miles)}</p>
    <p class="pr">${esc(money(c.price))}</p>
  </div></a>`;
}

const gridOf = (cars) => cars.length
  ? `<div class="grid">${cars.map(card).join('\n')}</div>`
  : `<p class="note">Nothing in this category at the moment — our stock changes weekly.
     <a href="${SITE}/cars-for-sale-in-uganda/">See everything we have in stock</a>,
     or WhatsApp us on <a href="${waLink(null)}">${PHONE_DISPLAY}</a> and we will source it for you.</p>`;

/* ----------------------------------------------------------- car page */
function carPage(c, all) {
  const imgs = c.images || [];
  const sold = isSold(c);
  const title = `${c.name} for sale in Uganda — ${money(c.price)} | ${BRAND}`;
  const description = (String(c.description || '').replace(/\s+/g, ' ').trim()
    || `${c.name} for sale in Kampala, Uganda. ${miles(c.miles)}.`).slice(0, 155);
  const url = `${SITE}/cars/${c.id}/`;
  const others = all.filter((x) => String(x.id) !== String(c.id) && !isSold(x)).slice(0, 4);

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: c.name,
    url,
    ...(c.year ? { vehicleModelDate: String(c.year), productionDate: String(c.year) } : {}),
    ...(imgs.length ? { image: imgs } : {}),
    ...(c.description ? { description: String(c.description) } : {}),
    ...(Number(c.miles) > 0 ? {
      mileageFromOdometer: { '@type': 'QuantitativeValue', value: Number(c.miles), unitCode: 'KMT' }
    } : {}),
    offers: {
      '@type': 'Offer',
      price: Number(c.price) || 0,
      priceCurrency: 'UGX',
      availability: sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url,
      seller: { '@type': 'AutoDealer', name: BRAND, telephone: PHONE_TEL, address: ADDRESS }
    }
  };

  const body = `
<p class="crumb"><a href="${SITE}/">Home</a> › <a href="${SITE}/cars-for-sale-in-uganda/">Cars for sale in Uganda</a> › ${esc(c.name)}</p>
${imgs[0] ? `<img class="hero" src="${esc(imgs[0])}" alt="${esc(c.name)} for sale in Kampala, Uganda" width="1120" height="460">` : ''}
${sold ? '<p><span class="tag">Sold</span></p>' : ''}
<p class="${sold ? 'sold-big' : 'price-big'}">${esc(money(c.price))}</p>
${sold
  ? `<p class="note">This car has been sold. <a href="${waLink(c)}" rel="noopener" target="_blank">Message us on WhatsApp</a> and we will tell you as soon as a similar one arrives.</p>`
  : `<p><a class="btn btn-a" href="tel:${PHONE_TEL}">Call ${PHONE_DISPLAY}</a>
     <a class="btn btn-g" href="${waLink(c)}" rel="noopener" target="_blank">WhatsApp about this car</a></p>`}
<table class="spec">
  <tr><th>Model</th><td>${esc(c.name)}</td></tr>
  ${c.year ? `<tr><th>Year</th><td>${esc(c.year)}</td></tr>` : ''}
  <tr><th>Mileage</th><td>${esc(miles(c.miles))}</td></tr>
  <tr><th>Price</th><td>${esc(money(c.price))}</td></tr>
  <tr><th>Availability</th><td>${sold ? 'Sold' : 'Available now'}</td></tr>
  <tr><th>Location</th><td>${esc(ADDRESS)}</td></tr>
</table>
${c.description ? `<h2>About this car</h2><p class="desc">${esc(c.description)}</p>` : ''}
${imgs.length > 1 ? `<h2>Photos</h2><div class="gal">${imgs.slice(1).map((s, i) =>
    `<img src="${esc(s)}" alt="${esc(c.name)} photo ${i + 2}" loading="lazy" width="300" height="225">`).join('')}</div>` : ''}
${others.length ? `<h2>More cars in stock</h2>${gridOf(others)}` : ''}`;

  return page({ title, description, canonical: url, h1: `${esc(c.name)} for sale in Uganda`, intro: '', body, jsonld });
}

/* ------------------------------------------------------- landing pages */
const has = (c, ...words) => words.some((w) => String(c.name || '').toLowerCase().includes(w));

function landingDefs(cars) {
  const live = cars.filter((c) => !isSold(c));
  const cheapLimit = 35000000;
  return [
    { slug: 'cars-for-sale-in-uganda',
      title: `Cars for Sale in Uganda — ${live.length} Used Cars in Stock | ${BRAND}`,
      h1: 'Cars for sale in Uganda',
      desc: `Browse ${live.length} quality used cars for sale in Uganda. Toyota, Mercedes-Benz, Range Rover and more, with honest prices in UGX. Call or WhatsApp ${PHONE_DISPLAY}.`,
      intro: `Every car below is in our showroom at ${ADDRESS}, ready to view and test drive. Prices are in Ugandan shillings and negotiable. Call or WhatsApp <a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a> to arrange a viewing.`,
      pick: (all) => all },
    { slug: 'cars-for-sale-in-kampala',
      title: `Cars for Sale in Kampala — Used Car Dealer in Nakasero | ${BRAND}`,
      h1: 'Cars for sale in Kampala',
      desc: `Used cars for sale in Kampala, Uganda. Our showroom is on ${ADDRESS}. View, test drive and buy the same day. Call ${PHONE_DISPLAY}.`,
      intro: `We are based in the middle of Kampala at ${ADDRESS}, so you can see any of these cars in person today. Call or WhatsApp <a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a> before you come and we will have the car ready.`,
      pick: (all) => all },
    { slug: 'cheap-cars-in-uganda',
      title: `Cheap Cars in Uganda — Affordable Used Cars from UGX 14M | ${BRAND}`,
      h1: 'Cheap cars in Uganda',
      desc: `Affordable used cars in Uganda. Clean, road-ready vehicles at honest prices, many under UGX 35 million. Call or WhatsApp ${PHONE_DISPLAY}.`,
      intro: 'Cheap does not have to mean worn out. These are the most affordable cars in our stock right now — all inspected, all driveable today.',
      pick: (all) => all.filter((c) => Number(c.price) > 0 && Number(c.price) <= cheapLimit)
                        .sort((a, b) => Number(a.price) - Number(b.price)) },
    { slug: 'toyota-ractis-for-sale', title: `Toyota Ractis for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota Ractis for sale in Uganda',
      desc: `Toyota Ractis for sale in Kampala, Uganda. Economical, reliable and cheap to run. Call or WhatsApp ${PHONE_DISPLAY}.`,
      intro: 'The Ractis is one of the most economical small cars on Ugandan roads — easy to park, cheap on fuel and cheap to service.',
      pick: (all) => all.filter((c) => has(c, 'ractis')) },
    { slug: 'toyota-vitz-for-sale', title: `Toyota Vitz for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota Vitz for sale in Uganda',
      desc: `Toyota Vitz for sale in Kampala, Uganda. Small, economical and easy to maintain. Call or WhatsApp ${PHONE_DISPLAY}.`,
      intro: 'Looking for a Vitz? Tell us and we will source one for you, usually within a week. Here is what we have in stock right now.',
      pick: (all) => all.filter((c) => has(c, 'vitz')) },
    { slug: 'toyota-harrier-for-sale', title: `Toyota Harrier for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota Harrier for sale in Uganda',
      desc: `Toyota Harrier for sale in Kampala, Uganda. Comfortable, strong and holds its value. Call or WhatsApp ${PHONE_DISPLAY}.`,
      intro: 'The Harrier remains one of the most wanted SUVs in Uganda — comfortable on long trips and strong enough for upcountry roads.',
      pick: (all) => all.filter((c) => has(c, 'harrier')) },
    { slug: 'toyota-land-cruiser-for-sale', title: `Toyota Land Cruiser for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota Land Cruiser for sale in Uganda',
      desc: `Toyota Land Cruiser and LC300 for sale in Kampala, Uganda. Built for any road in the country. Call or WhatsApp ${PHONE_DISPLAY}.`,
      intro: 'Nothing handles Ugandan roads like a Land Cruiser. These are ready to drive away today.',
      pick: (all) => all.filter((c) => has(c, 'land cruiser', 'landcruiser', 'lc300', 'prado')) },
    { slug: 'range-rover-for-sale', title: `Range Rover for Sale in Uganda | ${BRAND}`,
      h1: 'Range Rover for sale in Uganda',
      desc: `Range Rover and Range Rover Evoque for sale in Kampala, Uganda. Luxury SUVs at honest prices. Call or WhatsApp ${PHONE_DISPLAY}.`,
      intro: 'Luxury that still works off the tarmac. Our Range Rovers are inspected and ready for viewing in Nakasero.',
      pick: (all) => all.filter((c) => has(c, 'range rover', 'evoque')) },
    { slug: 'toyota-mark-x-for-sale', title: `Toyota Mark X for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota Mark X for sale in Uganda',
      desc: `Toyota Mark X for sale in Kampala, Uganda. Smooth, powerful and affordable. Call or WhatsApp ${PHONE_DISPLAY}.`,
      intro: 'A comfortable saloon with real power, and still one of the best value executive cars in Uganda.',
      pick: (all) => all.filter((c) => has(c, 'mark x')) },
    { slug: 'toyota-noah-for-sale', title: `Toyota Noah for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota Noah for sale in Uganda',
      desc: `Toyota Noah for sale in Kampala, Uganda. Seven seats, perfect for family or business. Call or WhatsApp ${PHONE_DISPLAY}.`,
      intro: 'The Noah is the practical choice for a big family or a small business — seven seats, sliding doors and low running costs.',
      pick: (all) => all.filter((c) => has(c, 'noah')) },
    { slug: 'toyota-passo-for-sale', title: `Toyota Passo for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota Passo for sale in Uganda',
      desc: `Toyota Passo for sale in Kampala, Uganda. One of the cheapest cars to run in the country. Call ${PHONE_DISPLAY}.`,
      intro: 'A first car that will not punish you at the fuel pump. Small, light and very cheap to maintain.',
      pick: (all) => all.filter((c) => has(c, 'passo')) },
    { slug: 'toyota-spacio-for-sale', title: `Toyota Spacio for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota Spacio for sale in Uganda',
      desc: `Toyota Spacio for sale in Kampala, Uganda. Compact seven seater at a low price. Call ${PHONE_DISPLAY}.`,
      intro: 'Seven seats without the bulk of a van, and famously cheap to keep on the road.',
      pick: (all) => all.filter((c) => has(c, 'spacio')) },
    { slug: 'toyota-ist-for-sale', title: `Toyota IST for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota IST for sale in Uganda',
      desc: `Toyota IST for sale in Kampala, Uganda. Compact, economical and reliable. Call ${PHONE_DISPLAY}.`,
      intro: 'A solid small hatchback for town driving, with Toyota reliability behind it.',
      pick: (all) => all.filter((c) => has(c, 'ist')) },
    { slug: 'toyota-rav4-for-sale', title: `Toyota RAV4 for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota RAV4 for sale in Uganda',
      desc: `Toyota RAV4 for sale in Kampala, Uganda. Compact SUV that handles any road. Call ${PHONE_DISPLAY}.`,
      intro: 'High clearance, low running costs and easy to sell on — the RAV4 is a safe buy in Uganda.',
      pick: (all) => all.filter((c) => has(c, 'rav4', 'rav 4')) },
    { slug: 'toyota-vanguard-for-sale', title: `Toyota Vanguard for Sale in Uganda | ${BRAND}`,
      h1: 'Toyota Vanguard for sale in Uganda',
      desc: `Toyota Vanguard for sale in Kampala, Uganda. Roomy SUV with seven seats. Call ${PHONE_DISPLAY}.`,
      intro: 'The Vanguard gives you RAV4 reliability with more space inside.',
      pick: (all) => all.filter((c) => has(c, 'vanguard')) },
    { slug: 'mercedes-benz-for-sale', title: `Mercedes-Benz for Sale in Uganda | ${BRAND}`,
      h1: 'Mercedes-Benz for sale in Uganda',
      desc: `Mercedes-Benz ML350, GLE400d and more for sale in Kampala, Uganda. Call or WhatsApp ${PHONE_DISPLAY}.`,
      intro: 'German engineering, inspected and priced honestly. Viewings in Nakasero, Kampala.',
      pick: (all) => all.filter((c) => has(c, 'mercedes', 'benz', 'ml350', 'gle')) },
    { slug: 'subaru-for-sale', title: `Subaru for Sale in Uganda | ${BRAND}`,
      h1: 'Subaru for sale in Uganda',
      desc: `Subaru Impreza XV and more for sale in Kampala, Uganda. All-wheel drive and quick. Call ${PHONE_DISPLAY}.`,
      intro: 'All-wheel drive as standard — a Subaru is happiest on the roads that worry other cars.',
      pick: (all) => all.filter((c) => has(c, 'subaru', 'imprez', 'forester', 'outback')) }
  ];
}

/* --------------------------------------------------------------- write */
async function out(rel, content) {
  const full = path.join(ROOT, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content, 'utf8');
}

async function main() {
  console.log('Fetching inventory from Supabase…');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cars?select=data,pos,updated_at&order=pos.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) throw new Error(`Supabase returned ${res.status}`);
  const rows = await res.json();
  const cars = rows.map((r) => r.data).filter((c) => c && c.id && c.name);
  const lastmod = new Date().toISOString().slice(0, 10);
  console.log(`  ${cars.length} cars (${cars.filter(isSold).length} sold)`);

  /* clean previously generated output so removed cars do not linger */
  for (const dir of ['cars', ...landingDefs(cars).map((d) => d.slug)]) {
    if (existsSync(path.join(ROOT, dir))) await rm(path.join(ROOT, dir), { recursive: true, force: true });
  }

  const urls = [{ loc: `${SITE}/`, pri: '1.0', freq: 'daily' }];

  /* ---- one page per car ---- */
  for (const c of cars) {
    await out(`cars/${c.id}/index.html`, carPage(c, cars));
    urls.push({ loc: `${SITE}/cars/${c.id}/`, pri: isSold(c) ? '0.4' : '0.8', freq: 'weekly' });
  }
  console.log(`  wrote ${cars.length} car pages`);

  /* ---- landing pages ---- */
  const defs = landingDefs(cars);
  for (const d of defs) {
    const picked = d.pick(cars);
    const live = picked.filter((c) => !isSold(c));
    const sold = picked.filter(isSold);
    const ordered = [...live, ...sold];
    const body = `${gridOf(ordered)}
<h2>Why buy from us</h2>
<p class="lede">We are a small dealership in Nakasero, Kampala. Every car is inspected before it reaches the showroom,
prices are in Ugandan shillings and negotiable, and you deal with the owner directly — not a call centre.
Call or WhatsApp <a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a>, or come and see us at ${esc(ADDRESS)}.</p>
<h2>Browse by model</h2>
<p class="links">${defs.filter((x) => x.slug !== d.slug)
      .map((x) => `<a href="${SITE}/${x.slug}/">${esc(x.h1)}</a>`).join(' · ')}</p>`;

    await out(`${d.slug}/index.html`, page({
      title: d.title, description: d.desc, canonical: `${SITE}/${d.slug}/`,
      h1: esc(d.h1), intro: d.intro, body,
      jsonld: {
        '@context': 'https://schema.org', '@type': 'AutoDealer', name: BRAND,
        url: `${SITE}/${d.slug}/`, telephone: PHONE_TEL, priceRange: 'UGX',
        address: { '@type': 'PostalAddress', streetAddress: 'Lumumba Avenue, Nakasero', addressLocality: 'Kampala', addressCountry: 'UG' },
        makesOffer: ordered.slice(0, 20).map((c) => ({
          '@type': 'Offer', itemOffered: { '@type': 'Car', name: c.name },
          price: Number(c.price) || 0, priceCurrency: 'UGX',
          availability: isSold(c) ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          url: `${SITE}/cars/${c.id}/`
        }))
      }
    }));
    urls.push({ loc: `${SITE}/${d.slug}/`, pri: '0.9', freq: 'daily' });
  }
  console.log(`  wrote ${defs.length} landing pages`);

  /* ---- sitemap.xml ---- */
  await out('sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`).join('\n') +
    `\n</urlset>\n`);

  /* ---- robots.txt ---- */
  await out('robots.txt',
    `User-agent: *\nAllow: /\n\n# Generated by build.mjs\nSitemap: ${SITE}/sitemap.xml\n`);

  console.log(`  sitemap.xml with ${urls.length} URLs + robots.txt`);
  console.log('Done.');
}

main().catch((e) => { console.error('BUILD FAILED:', e.message); process.exit(1); });
