// The 2D projects list. Reuses the SAME project data the 3D game uses,
// so you maintain projects in one place (../data/projects/index.js).
import { PROJECTS } from '../data/projects/index.js';

export default function Projects() {
  return (
    <section className="section" id="projects">
      <h2 className="section-title">Projects</h2>
      <div className="proj-grid">
        {PROJECTS.map((p) => (
          <article className="proj-card" key={p.title} style={{ '--accent': p.accent || '#35e0a8' }}>
            <h3>{p.title}</h3>
            <p className="proj-stack">{p.stack}</p>
            <p className="proj-desc">{p.description}</p>
            <div className="proj-links">
              {p.demo && <a href={p.demo} target="_blank" rel="noopener">Live Demo ↗</a>}
              {p.repo && <a href={p.repo} target="_blank" rel="noopener">GitHub ↗</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
