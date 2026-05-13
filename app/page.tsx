import styles from './page.module.css';

const features = [
  {
    title: '학교별 내신 대비',
    description: '도래울권 학교 흐름에 맞춰 시험 범위와 유형을 촘촘하게 관리합니다.'
  },
  {
    title: '수준별 커리큘럼',
    description: '초등부터 고등까지 현재 실력에 맞춘 반 편성과 단계별 학습을 운영합니다.'
  },
  {
    title: '정기 테스트와 피드백',
    description: '단어, 문법, 독해, 서술형을 반복 점검하며 약점을 빠르게 보완합니다.'
  },
  {
    title: '개별 학습 관리',
    description: '학생별 부족한 지점을 확인하고 필요한 학습 루틴을 함께 잡아갑니다.'
  }
];

const programs = ['초등 영어', '중등 내신', '고등 내신', '방학 특강', '서술형 대비', '정기 테스트'];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <nav className={styles.nav} aria-label="대세영어학원">
            <img
              alt="대세영어학원"
              className={styles.logo}
              height="52"
              src="/daesae-logo.webp"
              width="152"
            />
            <a className={styles.navLink} href="tel:050803223733">
              상담 문의
            </a>
          </nav>

          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>도래울 영어 내신 관리</p>
            <h1>영어의 기준을 바꾸는 대세영어학원</h1>
            <p className={styles.lead}>
              체계적인 커리큘럼과 꼼꼼한 피드백으로 학생이 스스로 설명할 수 있는
              영어 실력을 만들어갑니다.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="tel:050803223733">
                전화 상담
              </a>
              <a
                className={styles.secondaryButton}
                href="https://naver.me/xCjBcZaU"
                rel="noreferrer"
                target="_blank"
              >
                위치 보기
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="intro-title">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>About</p>
          <h2 id="intro-title">대세영어학원 도래울캠퍼스</h2>
          <p>
            영어를 외우는 과목으로만 두지 않고, 읽고 이해하고 설명하는 힘까지
            연결합니다.
          </p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article className={styles.feature} key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.band} aria-labelledby="program-title">
        <div className={styles.bandContent}>
          <div>
            <p className={styles.kicker}>Class</p>
            <h2 id="program-title">수업 안내</h2>
            <p>
              학년과 목표에 따라 내신, 어휘, 독해, 문법, 서술형 학습을 균형 있게
              설계합니다.
            </p>
          </div>
          <ul className={styles.programList}>
            {programs.map((program) => (
              <li key={program}>{program}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.infoSection} aria-labelledby="contact-title">
        <div className={styles.infoCard}>
          <p className={styles.kicker}>Visit</p>
          <h2 id="contact-title">문의 및 위치</h2>
          <dl className={styles.infoList}>
            <div>
              <dt>주소</dt>
              <dd>경기 고양시 덕양구 도래울로 42-5 4층</dd>
            </div>
            <div>
              <dt>상담 전화</dt>
              <dd>
                <a href="tel:050803223733">0508-0322-3733</a>
              </dd>
            </div>
            <div>
              <dt>운영 시간</dt>
              <dd>14:00 - 22:00</dd>
            </div>
          </dl>
        </div>
        <div className={styles.notice}>
          <h2>입학 상담은 예약제로 진행됩니다.</h2>
          <p>
            학생의 현재 학습 상태와 목표를 먼저 확인한 뒤, 필요한 수업 방향을
            안내합니다.
          </p>
          <a
            className={styles.mapButton}
            href="https://naver.me/xCjBcZaU"
            rel="noreferrer"
            target="_blank"
          >
            네이버 지도에서 보기
          </a>
        </div>
      </section>
    </main>
  );
}
