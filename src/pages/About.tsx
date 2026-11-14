import './About.css';

const blogTechnologies = ['React', 'TypeScript', 'Vite', 'Markdown', 'GitHub Pages'];

export default function About() {
  return (
    <div className="about-wrap">
      <div className="about">
        <button className="about__back" onClick={() => window.history.back()}>← 돌아가기</button>
        <h1>안녕하세요</h1>
        <p className="about__intro">
          프론트엔드 개발을 중심으로 서비스의 흐름과 운영까지 고려한 구현을 고민합니다.<br />
          이곳에는 개발 과정에서 마주친 문제와 기술적 판단, AI 시대의 개발 경험을 기록합니다.
        </p>

        <section className="about__section">
          <h2>이 블로그의 기술</h2>
          <div className="about__skills">
            {blogTechnologies.map(skill => (
              <span key={skill} className="skill-badge">{skill}</span>
            ))}
          </div>
        </section>

        <section className="about__section">
          <h2>주로 다루는 주제</h2>
          <ul>
            <li>프론트엔드와 JavaScript 개발</li>
            <li>웹 기술과 컴퓨터 과학 기초</li>
            <li>AI 도구를 활용한 개발 방식과 실험</li>
            <li>개발 과정의 판단과 회고</li>
          </ul>
        </section>

        <section className="about__section">
          <h2>Links</h2>
          <a
            href="https://github.com/hyunjss"
            target="_blank"
            rel="noreferrer"
            className="about__link"
          >
            GitHub →
          </a>
        </section>
      </div>
    </div>
  );
}
