import { base, profile } from "../content";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="orb" aria-hidden />
        <p className="eyebrow">{profile.role}</p>
        <p className="designation">{profile.designation}</p>
        <h1 className="gradient-text">{profile.name}</h1>
        <p className="tagline">{profile.tagline}</p>
        <div className="cta">
          <a href={`${base}/algo/`} className="btn primary">Explore Algo Lab →</a>
          <a href={profile.resume} className="btn" download>Download resume ↓</a>
          <a href={profile.github} className="btn">GitHub</a>
        </div>
      </section>

      <section id="intro" className="section intro">
        <p className="eyebrow">Intro</p>
        <p className="summary reveal">{profile.summary}</p>
        <p className="summary-sub reveal">{profile.summarySub}</p>

        <ol className="journey">
          {profile.stages.map((s) => (
            <li key={s.tag} className="stage-card reveal">
              <span className="stage-tag">{s.tag}</span>
              <h3>{s.title}</h3>
              <p>{s.blurb}</p>
              <ul>
                {s.points.map((pt) => <li key={pt}>{pt}</li>)}
              </ul>
            </li>
          ))}
        </ol>

        <dl className="metrics">
          {profile.metrics.map((m) => (
            <div key={m.label} className="metric reveal">
              <dt>{m.value}</dt>
              <dd>{m.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section reveal">
        <h2>Selected work</h2>
        <div className="cards">
          {profile.projects.map((p, i) => (
            <a
              key={`${p.title}-${i}`}
              href={p.href}
              className="pcard"
              {...(p.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <h3>{p.title}</h3>
              <p>{p.blurb}</p>
              {"tags" in p && (
                <ul className="tags">
                  {p.tags.map((t) => <li key={t}>{t}</li>)}
                </ul>
              )}
            </a>
          ))}
        </div>
      </section>

      <section className="section reveal">
        <h2>Skills</h2>
        <ul className="chips">
          {profile.skills.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </section>

      <section id="resume" className="section reveal">
        <h2>Resume</h2>
        <div className="resume-card">
          <div>
            <h3>{profile.name}</h3>
            <p>{profile.role}</p>
          </div>
          <a href={profile.resume} className="btn primary" download>Download PDF ↓</a>
        </div>
      </section>

      <footer className="section contact">
        <h2>Get in touch</h2>
        <p><a href={`mailto:${profile.email}`}>{profile.email}</a></p>
        <p><a href={`tel:${profile.phone.replace(/-/g, "")}`}>{profile.phone}</a></p>
      </footer>
    </main>
  );
}
