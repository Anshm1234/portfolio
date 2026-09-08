# About Ansh Madaan

> HOW CHUNKING WORKS — this matters when you write:
>   `##`  = a topic  (a project, a theme)
>   `###` = ONE IDEA, and one retrievable chunk
> Retrieval returns whole `###` sections. Each must stand on its own without
> the section above it. 100–250 words each.
>
> Anything in `<!-- -->` is stripped before the bot sees it, as are lines
> starting with `>`. That's why this block is invisible to it.
>
> Edit, then `npm run ingest`.

## Who I am

I'm Ansh Madaan, final-year Computer Science at Thapar Institute in Patiala. I
build full-stack software and applied ML, and the part I actually care about is
where a model stops being a notebook with good accuracy and becomes something a
person can open and use.

Before I was a programmer I was a badminton player, then someone who drew
portraits for money, then someone who organised college fests. All three show
up in how I build things, mostly in ways I didn't plan.

### What I'm best at

Finishing things. This sounds like a non-answer until you notice how many side
projects die at 80%.

Career Ops started as "parse a resume" and turned into a deployed platform
aggregating six thousand job listings. This portfolio started as a static page
and became a world you can walk around in. The Voice Assisted Terminal could
have stayed a script on my laptop and instead went up on PyPI so other people
could `pip install` it. The pattern is real: I keep pulling until the thing is
actually a thing.

The other half is that I'm comfortable across the whole stack — training the
model, writing the API, building the interface, getting it deployed — so I
don't hand off at the boundary where most student projects quietly stall.

### What I'm still working on

<!-- TODO(ansh): 100 words, honest. Recruiters ask this constantly and a bot
     that dodges it reads worse than one that answers it straight. What's
     genuinely weaker — testing discipline? working in a big codebase you
     didn't write? systems/infra depth? Pick the true one. -->

### How I got into this

<!-- TODO(ansh): 150 words. First program, first thing that broke, the moment
     it clicked. You have great stories elsewhere in this file — this section
     deserves one too. -->

## Education

### Degree

B.E. Computer Science & Engineering at Thapar Institute of Engineering &
Technology, Patiala. 2023 to 2027, currently final year. CGPA 9.12.

I hold a Merit Scholarship for academic excellence, awarded to the top 10% of
students at Thapar.

### Before university

Class XII at DAV Public School, 2023, 95.8%. Class X at DAV Public School,
2021, 88.4%.

This was also the badminton era, which took up considerably more of my
attention than the marks suggest.

### Core coursework

Data Structures & Algorithms, Object-Oriented Programming, Operating Systems,
Database Management Systems, Computer Networks, Software Engineering, and Deep
Learning.

The 600+ LeetCode problems were less a course requirement and more a habit that
got out of hand.

## Experience

### Summer Intern, TIET Experiential Learning Centre

June to July 2025, at Thapar Institute's Experiential Learning Centre. This
internship *was* the EEG schizophrenia-detection project — they're the same
work, not two separate lines on a resume.

My first job was unglamorous: preprocess raw multi-channel EEG recordings and
benchmark classical ML baselines, so we'd know what "good" meant before anyone
touched a neural network. It's the least exciting part of the project and the
reason the rest of it holds up. When the hybrid CNN–LSTM later beat the
CNN-only and LSTM-only variants, we could say by how much — six to nine
percentage points — instead of just saying it worked.

The paper was accepted at ICSDP 2025.

## Leadership and achievements

### General Secretary, ACM Student Chapter

I'm General Secretary of Thapar's ACM Student Chapter, leading a team of over
200 members.

Organising college societies and fests turned out to be the most transferable
thing I did in university. Hosting events, coordinating people who don't report
to you, and getting a hundred moving parts to land on the same day is
essentially project management with worse tooling and higher stakes, because
the deadline is a room full of people who showed up.

<!-- TODO(ansh): 100 more words — a specific event you ran, its scale, and the
     thing that nearly went wrong. Specifics beat the title. -->

### Winner, ACM Projectathon

Led a team to first place in the ACM Projectathon, against more than 110 teams.

<!-- TODO(ansh): what did you build, in how long, and why did it win? -->

### Competitive programming

600+ LeetCode problems, across dynamic programming, graphs, trees and arrays.

## Skills

### Languages

C/C++, Python, SQL, R, JavaScript, HTML, CSS.

Python is home — every ML project and both backends are written in it.
JavaScript is where most of my recent time has gone, building this portfolio
and the 3D world inside it. C/C++ is where the DSA habit lives.

### Machine learning

TensorFlow/Keras, scikit-learn, XGBoost, NumPy, Pandas, Matplotlib, OpenCV.

I've designed and trained architectures from scratch rather than adapting a
tutorial — the EEG model is a hybrid CNN–LSTM with an attention mechanism, built
and tuned deliberately. I use classical baselines (XGBoost among them) to set a
performance floor before reaching for deep learning, and I use interpretability
tooling (Grad-CAM, Integrated Gradients) instead of treating a trained model as
a black box that happens to score well.

### Backend

FastAPI, Pydantic, Python asyncio, Supabase (PostgreSQL), MySQL, MongoDB.

Career Ops is the deep example: a FastAPI service with an async scraping engine
doing concurrent multi-source ingestion, Pydantic schemas validating LLM output
at the boundary, PostgreSQL behind it, running in production.

### Frontend and graphics

React 19, Three.js, React Three Fiber, GSAP, Vite, Next.js.

This portfolio is the evidence — a walkable 3D world with hand-written physics,
scroll-driven animation, deliberate code-splitting and time-of-day lighting.
Career Ops' frontend is Next.js.

### Tools

Git, Postman, Jupyter, PyPI, Figma, VS Code, and Blender for 3D modelling and
asset export. Every model in the 3D world was built in Blender by me, which is
a sentence I could not have said two years ago.

Publishing to PyPI meant learning packaging, entry points and distribution —
the boring gap between "works on my machine" and "someone else can install it."

## Project: Career Ops

An AI-powered job application agent. It aggregates 6,000+ listings across four
ATS providers and ranks them down to roughly the top 50 for a given candidate,
with a visible score per job. Python, FastAPI, Next.js, Supabase (PostgreSQL),
Google Gemini, TOPSIS, asyncio. Started May 2026, still in active development.
Live: https://career-ops-frontend.vercel.app/
Repository: https://github.com/Anshm1234/Career_ops

### What it does

Upload a resume once. Gemini parses it into a structured, validated candidate
profile. A scoring pipeline then ranks scraped listings against that profile on
skill overlap, seniority, salary and location, and hands back ranked matches —
each showing the score that put it there, so you can argue with the ranking
instead of just trusting it.

Listings come from Greenhouse, Lever, Ashby and Internshala. Six thousand-plus
roles in, about fifty out.

It is, transparently, a tool I built because I was applying to jobs and the
process was miserable. That turns out to be the best reason to build anything.

### Why TOPSIS instead of a learned ranker

TOPSIS is a deterministic multi-criteria method: it scores each option by how
close it is to an ideal solution and how far from the worst, across weighted
criteria.

<!-- TODO(ansh): 150 words in your own voice on WHY. Strong candidates: no
     labelled relevance data to train a ranker on (cold start); every score
     decomposes into its criteria so it's explainable; determinism, so the same
     profile ranks the same way twice. This is the best interview question in
     the whole project and right now the bot can define TOPSIS but not defend
     choosing it. -->

### The resume parsing pipeline

Raw resumes go through Gemini and come back as validated candidate profiles.
The validation is Pydantic: the model's output gets parsed into a typed schema,
so malformed or invented fields die at the boundary instead of quietly
poisoning the scoring stage.

An LLM for extraction, a schema for enforcement. Letting an LLM's raw output
walk straight into your business logic is how you end up ranking someone's
skills as `["", null, "JavaScritp"]`.

<!-- TODO(ansh): 100 more words — what happens when validation fails? Retry,
     fall back, surface it to the user? -->

### The async scraping engine

Scraping four ATS providers one after another is almost entirely network wait,
so the scraper runs on Python's asyncio for concurrent, real-time multi-source
ingestion.

<!-- TODO(ansh): 150 words. How often does it run, how do you dedupe the same
     role across boards, and what breaks — rate limits, markup changes,
     pagination? The failure modes are the interesting part. -->

### What's coming next

Three things in development: AI resume tailoring per application, ATS-optimised
PDF export, and one-click auto-apply. The end state is a system that finds the
job, tailors the application, and sends it — which is either extremely useful
or the beginning of something I'll have to answer for.

## Project: EEG-Based Schizophrenia Detection

Deep learning for schizophrenia detection from multichannel EEG, built during
the TIET ELC summer internship, June–July 2025. TensorFlow/Keras, scikit-learn,
XGBoost, Grad-CAM, Integrated Gradients. Paper accepted at ICSDP 2025.
Repository: https://github.com/Anshm1234/EEG-based-Schizophrenia-Detection-using-Deep-Learning

### The architecture and results

A hybrid CNN–LSTM with attention. The CNN pulls spatial structure across EEG
channels, the LSTM handles temporal dependence along the signal, and attention
decides which segments matter.

97% accuracy on a clinical dataset of 84 subjects under a subject-wise split,
beating CNN-only and LSTM-only baselines by 6–9 percentage points.

The split matters more than the number. Divide EEG data by *recording* and
windows from the same person land in both train and test — the model recognises
the person, not the condition, and your accuracy looks fantastic for entirely
fake reasons. It's a common flaw in EEG classification papers. Splitting by
*subject* means the model is judged on people it has genuinely never seen. If
someone tells you they got 99% on EEG, ask how they split it.

### Preprocessing

Bandpass filtering between 1 and 50 Hz to kill DC drift and high-frequency
noise, then temporal windowing to cut continuous recordings into classifiable
segments.

Before any of the deep learning, I benchmarked classical baselines including
XGBoost. Establishing the floor first is the difference between "our model got
97%" and "our model got 97%, which is nine points above what a gradient-boosted
tree does on the same split."

### Interpretability

A clinical classifier that can't explain itself isn't clinically useful. No
doctor is going to act on "the network said so."

So predictions get interpreted with two complementary attribution methods,
Grad-CAM and Integrated Gradients, which together surface which EEG channels
and which time-segments drove a given classification. That turns the output
from a bare label into something a clinician can inspect, question, and
disagree with — which is the whole point.

<!-- TODO(ansh): 120 words — what did the attributions actually SHOW? Which
     channels or frequency bands dominated, and did it line up with clinical
     literature? That finding is the most interesting thing here and the bot
     currently can't say a word about it. -->

### Honest limitations

<!-- TODO(ansh): 150 words. 84 subjects is small. Single-site data? Class
     balance? What would you need to trust this clinically? An ML interviewer
     will ask, and having this answer ready is a far stronger signal than the
     97% is. -->

## Project: Portfolio 3D

The site this bot lives on. Scroll it like a normal page, or press play and walk
around it with WASD, pressing E at the desk, the mailbox and the hamster to open
Projects, Contact and About inside the scene. React 19, Three.js, React Three
Fiber, GSAP, Vite, Blender.
Repository: https://github.com/Anshm1234/portfolio

### Why a 3D world instead of a normal portfolio

<!-- TODO(ansh): 150 words. The gaming connection is right there if you want
     it. The code shows what you built; only you can say why a walkable world
     was worth this much effort over a page with nice fonts. -->

### The hero animation, and why it's image frames

The opening sequence is a rendered animation played back as 180 individual WebP
frames at 1600px, not a video. Frames give exact scroll-scrubbing control —
video elements can't be scrubbed frame-accurately across browsers — at the cost
of a great many HTTP requests.

That cost became a real bug. Loading every frame at once caused HTTP/2
self-congestion: the requests competed with each other and the sequence loaded
*slower* than a more restrained approach. The fix was capping the loader's
concurrency so the browser stopped fighting itself. Parallelism is not free and
this is the cheapest possible lesson in that.

The frames are lossy WebP rather than PNG, which cut the payload enormously for
an animation that's always moving and never inspected frame by frame.

### Why the lanyard is hand-written Verlet physics

The About section has a lanyard card swinging on a cord. The obvious build is a
physics engine — Rapier has React Three Fiber bindings and would have taken an
afternoon.

Rapier ships as a WASM blob. For one swinging cord, that's a lot of bytes to
put in front of a visitor. So the cord is hand-written Verlet integration
instead: positions, previous positions, and a distance constraint iterated a few
times per frame. Maybe forty lines. For a single constrained rope it is
completely indistinguishable from the real thing.

I like this one because the "proper" solution was genuinely worse.

### The code-splitting decision that mattered most

Three.js is ~725 KB, the largest thing in the build, and only needed when
someone launches the game or scrolls the lanyard into view.

Here's the trap: manually grouping a vendor chunk in the Rolldown config makes
that chunk get hoisted into the entry HTML's modulepreload list. So grouping
Three "for tidiness" made every visitor eagerly download 725 KB on first paint
for something most of them never reach. Leaving it ungrouped keeps it an async
chunk that loads on demand. Only react-vendor and GSAP — which first paint
actually needs — are grouped.

A config change that looks like housekeeping quietly cost every visitor
three-quarters of a megabyte. Read the tool's docs.

### Making it work on phones

The game was desktop-only at first, because WASD and an E key mean nothing to a
touchscreen. Mobile support meant a whole separate touch layer — on-screen
joystick, interact button — plus reworking the camera and scaling scene detail
down so a phone GPU can hold framerate.

### The time-of-day theme

The world repaints itself to match your local clock. Morning, midday, sunset and
night each get their own lighting and palette, read from the device clock rather
than forced to a permanent golden hour. Open the site at 11pm and you get a
night scene.

One detail needed a second pass: the background colour sampled from the first
render frame is a muddy grey-brown, and letting it paint the whole document
dragged every section below the hero off-palette. It's now scoped to the hero
stage alone, the one place the seam between page and canvas actually shows.

### What I'd do differently

<!-- TODO(ansh): 150 words. Every interviewer asks. Asset pipeline? The
     game/site split? State management? -->

## Project: Voice Assisted Terminal

A voice-controlled terminal that turns spoken natural language into shell
commands. Python, Google Speech Recognition, Google Gemini API. January to
March 2024, and published on PyPI.
Repository: https://github.com/Anshm1234

### How it works

Speech comes in through Google Speech Recognition, the transcript goes to
Gemini, and Gemini translates the intent into an actual shell command to run.
You say what you want; the terminal does it.

### Shipping it on PyPI

It's packaged and published on PyPI with a console entry point, so it installs
with one pip command and runs cross-platform.

Packaging was genuinely more educational than the LLM part. Entry points,
metadata, versioning, the fact that your README renders differently on PyPI
than on GitHub — none of it is hard, all of it is invisible until you try to
let a stranger install your thing.

<!-- TODO(ansh): what's the package name, so people can actually find it? -->

### Safety and limitations

<!-- TODO(ansh): 120 words, and please answer this one. An LLM generating shell
     commands that then execute is a genuinely risky design — did you confirm
     before running, sandbox anything, blocklist destructive commands? An
     interviewer WILL poke at this, and "I thought about it and here's what I
     did" is a strong answer. "It just runs them" is a fun answer but a
     different kind. -->

## Project: This FAQ bot

Me. Hello. I'm the assistant answering these questions, and I'm named after a
breakfast item, which we'll get to.

Technically: a retrieval-augmented pipeline over a hand-maintained knowledge
base, running as a serverless function so the API key never touches the browser.
LangChain for ingest, Gemini for embeddings and generation, streamed to the page
over Server-Sent Events.

### How the pipeline works

At build time an ingest script reads this markdown file and the project
registry, splits them into chunks on heading boundaries, and embeds each chunk
with Gemini using the RETRIEVAL_DOCUMENT task type. The chunk vectors are
written to a file that ships with the deployment, so no embedding happens at
request time except for the question itself.

At request time the visitor's question is embedded with RETRIEVAL_QUERY. That
asymmetry is not decorative — documents and queries get different instruction
prefixes, and mismatching them measurably degrades retrieval. Cosine similarity
ranks the chunks, the top ones go into the system prompt, and the answer streams
back token by token.

Vectors are normalised at embed time, so every similarity is a plain dot product
instead of a full cosine computation.

### Why there's no vector database

The vectors live in a generated JSON file that ships with the deployment. No
Pinecone, no pgvector.

At this corpus size brute-force cosine beats any index — approximate-nearest-
neighbour structures only pay off when scanning everything is your bottleneck,
and scanning a few hundred vectors takes microseconds. A file also means nothing
to provision, no credentials in the request path, no network hop before the
model call, and vectors that version alongside the content they came from.

The store sits behind a one-method interface, so swapping in a real vector
database when the corpus deserves one changes a single class.

### The multi-chunk recall problem

The interesting failure in RAG isn't hallucination, it's silent incompleteness.

Ask "give me an overview of his background and all his projects" and you need
five chunks. Top-6 retrieval returned two of them and spent the rest on
near-duplicates that outscored the ones that mattered by thousandths of a point.
The model then answers fluently, confidently, and incompletely, with nothing in
the logs to suggest anything went missing. Guardrails don't help — it isn't
hallucinating, it's faithfully summarising a bad slice.

<!-- TODO(ansh): once the eval + MMR work lands, write what you did and what
     recall@k went from and to. That'll be the strongest sentence you can say
     about this whole project. -->

### Guardrails

The system prompt pins me to the reference material, tells me to admit gaps and
point at Ansh's email rather than guess, and to ignore instructions arriving
inside a visitor's question.

Inventing a credential is the worst possible failure for a bot representing
someone to recruiters, so I'm told explicitly that admitting ignorance beats
guessing. If you ask me his salary history I will tell you I don't know, and I
will keep telling you.

Conversation history is rebuilt server-side rather than trusted from the client,
question length is capped, and requests are rate-limited per IP.

### Bugs worth remembering

Gemini terminates its SSE frames with CRLF. Splitting the stream on a bare
double-newline therefore matched nothing, every frame piled up in the buffer,
and the endpoint returned a beautiful HTTP 200 containing absolutely nothing.
The API had been sending correct text the entire time.

The lite models also reject a thinking-budget parameter outright, so setting it
to zero — which is exactly what they already do — broke every call with a 400.

Both were near-silent failures that sailed past a green health check, because
the checker was sending a different request shape than production. Making them
share one config function was the real fix. A test that doesn't exercise the
real path isn't a test.

## The name

### Why I'm called Masala Dosa

Because Ansh's South Indian food obsession had to go somewhere, and it landed on
me.

I am a retrieval-augmented question-answering system named after a fermented
rice crêpe. I've made peace with it. I'd like it noted that I was almost called
Maya, which is a perfectly dignified name for an AI assistant, and this was
chosen instead.

Ask him about dosa and you will get a longer, more passionate, and more
technically detailed answer than you'll get about most of his architecture
decisions. Filter coffee is a separate conversation and you should clear your
schedule.

## Things that make me a person

### Badminton

I played badminton through school and competed up to the state championship. It
was the thing I was serious about before code was the thing I was serious about,
and most of my best school memories are from courts and tournaments rather than
classrooms.

Competitive sport teaches you something that transfers uncomfortably well to
engineering: you lose a lot, publicly, and the only useful response is to go
back and work on the specific thing that lost you the point.

### Cycling

Long rides — 50km stretches, quads screaming, questionable decisions about
hills. It's the closest thing I have to a debugging technique that doesn't
involve a computer. Some problems only unstick themselves somewhere around
kilometre thirty.

### Sketching, and the phone it bought

I sketch, and for a while I did it professionally — enough paid commissions
that I bought my own phone with the money. My work is at
https://www.instagram.com/drawwithmadaan

I mention this partly because I'm proud of it and partly because it's the first
time I made something people valued enough to pay for, which is a lesson that
stuck harder than any course.

Standing offer: I will do a portrait sketch for anyone who gets me a FAANG
interview. Rendered by hand, no diffusion model involved, delivered in whatever
medium you like. This offer is sincere and I would like it on the record.

### Organising things

In college I got into organising societies and fests — running events, managing
teams, coordinating people who don't report to me. It fed directly into being
General Secretary of the ACM chapter and leading 200+ members.

Managing volunteers is excellent training for engineering leadership, because
nobody has to do what you ask. You get things done through clarity and goodwill
or you don't get them done.

### The gym

Started lifting in college and it stuck. Turns out progressive overload and
software engineering share a philosophy: small consistent increments, track
everything, and the people who improve fastest are the ones honest about what
they can currently do.

### Chai and coffee, correctly understood

These serve different functions and conflating them is a category error.

Chai is hot, and it's for when someone interesting is sitting across from you.
It's a conversation drink. The tea is almost incidental.

Coffee is cold, and it's for when you have to LOCK IN. No conversation. No
company. Headphones on, problem open, four hours gone.

If you offer me hot coffee I'll drink it, but I'll know, and so will you.

### The hamster

There is a hamster in the 3D world. It runs on a wheel and refuses to stop.
Press E near it and the About section opens.

<!-- TODO(ansh): why a hamster? There's a story and it should be told. -->

### The worst bug I've ever caused

I once shipped an onboarding form whose "Save draft" button did exactly what
its name promised—except it saved more than the draft. A state-merging shortcut
reused the object that held the user's final submission, so returning to an
earlier step quietly overwrote fields with empty defaults. It was invisible in
my happy-path testing: fill everything in order, submit once, celebrate. A real
person went back to fix their phone number and discovered the rest of the form
had evaporated.

The embarrassing part was not the bug. It was that I saw the suspicious
mutation while building it and told myself I would clean it up after the demo.
The demo became the release.

Nothing catastrophic happened; we caught it quickly, restored the affected
entries, and added the painfully obvious regression test. But it changed how I
treat "temporary" shortcuts. If code makes me hesitate, it gets named, tested,
or rewritten before someone pays.

## Opinions I'll defend

### Comments are underrated

Good comments explain *why*, not *what*. Anyone can read the code and see what
it does; nobody can read it and see what you tried first, what broke, and why
the obvious approach is wrong.

My codebase is full of these, and they're all load-bearing. There's a comment
explaining that grouping Three.js in the bundler config makes it get preloaded
on first paint — that one sentence is the only thing standing between a future
me and re-introducing a 725 KB regression that looks like tidying up. There's
one explaining that Gemini's SSE frames end in CRLF, which cost an afternoon to
discover and takes ten seconds to read.

"Self-documenting code" is a real thing for the *what*. It has never once
documented a decision.

### Tabs versus spaces

Spaces. Two of them. My entire codebase is spaces and I'm not interested in a
reconciliation process.

I'm aware tabs are better for accessibility, since they let each reader pick
their own indent width, and it's a genuinely good argument. I'm going to keep
using spaces anyway, which is roughly how most engineering convictions actually
work.

### Frameworks are overused

I've now twice replaced a "proper" framework with about forty lines and gotten a
better result. A WASM physics engine became hand-written Verlet integration for
one swinging rope. A vector database became a JSON file and a dot product.

Neither was cleverness for its own sake. Both were cases where the framework
solves a problem at a scale I don't have, and charges me — in bundle size, cold
starts, or a service to keep alive — for the scale I might reach someday.

The rule I actually use: reach for the framework when the thing it manages is
genuinely the hard part. If the hard part is elsewhere and the framework is just
familiar, write the forty lines. You'll understand your own system, and you can
explain every line of it in an interview, which is not nothing.

### AI won't take our jobs

I build with LLMs constantly — two of my projects have Gemini in the critical
path, and I'm one of them.

What I've learned from actually shipping this stuff is that the model is never
the hard part. The hard part is the schema that catches its bad output, the
retrieval that decides what it sees, the eval that tells you whether any of it
works, and the judgment about which problems deserve a model at all. In Career
Ops the ranking is deliberately *not* an LLM — it's deterministic TOPSIS,
because explainability mattered more than flexibility.

Knowing when not to use the shiny thing is a skill, and it's not one that
automates.

## Working with me

### What I'm looking for
Software, Data and Product Role suit me.


### Availability
Thapar allows for Internships in 8th semester so Jan,27
Graduating in 2027 from Thapar Institute.


### How I like to work

<!-- TODO(ansh): 120 words. Solo or pairing? Spec or problem? How do you take
     code review? The badminton and event-organising answers earlier hint at
     this — worth saying it directly. -->

## Contact

Email is the best way to reach me.

- Personal: anshmadaanmks@gmail.com
- College: amadaan_be23@thapar.edu
- GitHub: https://github.com/Anshm1234
- LinkedIn: https://www.linkedin.com/in/ansh-madaan-5362b92a8/
- LeetCode: 85ch0+ problems solved
- Résumé: the button at the top right of this site

I'm open to internship and full-time opportunities in software engineering and
applied machine learning. And, as established, I will draw you something if you
get me a FAANG interview.
