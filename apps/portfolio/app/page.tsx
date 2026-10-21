import { profile } from "../content";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="orb" aria-hidden />
        <p className="eyebrow">{profile.role}</p>
        <h1 className="gradient-text">{profile.name}</h1>
        <p className="tagline">{profile.tagline}</p>
        <div className="cta">
          <a href="/algo/" className="btn primary">Explore Algo Lab →</a>
          <a href={profile.github} className="btn">GitHub</a>
        </div>
      </section>

      <section className="section reveal">
        <h2>Selected work</h2>
        <div className="cards">
          {profile.projects.map((p) => (
            <a key={p.title} href={p.href} className="pcard">
              <h3>{p.title}</h3>
              <p>{p.blurb}</p>
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

      <footer className="section">
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
      </footer>
    </main>
  );
}
