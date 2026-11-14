import './About.css';

export default function About() {
  return (
    <div className="about-wrap">
      <div className="about">
        <button className="about__back" onClick={() => window.history.back()}>← 돌아가기</button>
        <h1>안녕하세요 👋</h1>
        <p className="about__intro">
          프론트엔드 개발자 <strong>hhyun</strong>입니다.<br />
          공부한 내용을 기록하고 공유하는 블로그입니다.
        </p>

        <section className="about__section">
          <h2>기술 스택</h2>
          <div className="about__skills">
            {['React', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Vite'].map(skill => (
              <span key={skill} className="skill-badge">{skill}</span>
            ))}
          </div>
        </section>

        <section className="about__section">
          <h2>주로 다루는 주제</h2>
          <ul>
            <li>프론트엔드 개발 (React, TypeScript)</li>
            <li>CS 이론 (운영체제, 네트워크, 자료구조)</li>
            <li>알고리즘 & 문제풀이</li>
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
