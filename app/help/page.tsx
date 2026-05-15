import styles from './help.module.css';

export const metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: '사이트 이용 도움말'
};

const guideSections = [
  {
    title: '학생 페이지 열기',
    items: [
      '학생에게 전달된 주소는 daesae.kro.kr/노션ID 또는 짧은 주소 형태로 열립니다.',
      '주소 끝에 긴 Notion ID가 붙어 있어도 마지막 ID만 인식해서 페이지를 불러옵니다.',
      '존재하지 않는 ID나 접근할 수 없는 페이지는 안내 화면으로 이동합니다.'
    ]
  },
  {
    title: '공지 관리',
    items: [
      'settings의 공지 영역에서 제목과 내용을 입력한 뒤 등록하면 학생 Notion 페이지 상단에 표시됩니다.',
      '표시 체크를 끄면 공지는 저장되어 있지만 학생 페이지에는 보이지 않습니다.',
      '수정은 기존 공지의 수정 버튼을 누른 뒤 내용을 바꾸고 저장하면 됩니다.'
    ]
  },
  {
    title: '짧은 주소 만들기',
    items: [
      '짧은 주소에는 학생에게 알려줄 단어를 넣고, Notion ID에는 연결할 페이지 ID를 넣습니다.',
      '예를 들어 H1ABTT를 등록하면 daesae.kro.kr/H1ABTT 주소로 해당 학생 페이지가 열립니다.',
      '이미 만든 주소는 목록에서 검색하고, 링크 복사 버튼으로 바로 전달할 수 있습니다.'
    ]
  },
  {
    title: 'Notion DB와 달력 보기',
    items: [
      '표, 보드, 달력은 원본 Notion 데이터를 가져와 사이트 안에서 직접 표시합니다.',
      '모바일에서는 표와 달력이 너무 넓을 수 있어 영역 안에서 좌우로 밀어 보도록 되어 있습니다.',
      '달력은 처음 열 때 오늘 날짜가 있는 월을 보여주고, 오늘 날짜를 강조합니다.'
    ]
  },
  {
    title: '화면과 테마',
    items: [
      '학생 페이지 오른쪽 위의 Dark 또는 Light 버튼으로 보기 모드를 바꿀 수 있습니다.',
      '한 번 고른 테마는 같은 브라우저에 저장되어 다음 접속 때도 유지됩니다.',
      '이미지가 늦게 뜨거나 실패하면 빈칸 대신 안내 문구가 표시됩니다.'
    ]
  },
  {
    title: '운영 시 확인할 것',
    items: [
      '학생에게 주소를 보내기 전에는 새 브라우저 탭에서 한 번 열어 확인하는 것이 좋습니다.',
      'Notion 페이지 권한이 비공개이면 사이트에서도 내용을 불러오지 못할 수 있습니다.',
      '공지와 짧은 주소는 현재 전체 적용 저장소에 저장되므로 다른 기기에서도 같은 내용이 보입니다.'
    ]
  }
];

const quickChecks = [
  '공지 등록 후 학생 페이지 상단에 보이는지 확인',
  '짧은 주소 등록 후 링크 복사로 열린 주소 확인',
  'Notion 원본에서 새 DB view를 추가했다면 사이트에서 탭이 보이는지 확인',
  '학생에게 전달하기 전 모바일 화면에서 한 번 확인'
];

export default function HelpPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>대세영어학원 선생님용</p>
            <h1>사이트 이용 도움말</h1>
            <p>
              학생 페이지 배포, 공지, 짧은 주소, Notion 화면 확인에 필요한 기본 사용법입니다.
            </p>
          </div>
          <div className={styles.headerActions}>
            <a className={styles.secondaryButton} href="/settings">
              설정으로
            </a>
            <a className={styles.homeLink} href="/">
              홈
            </a>
          </div>
        </header>

        <section className={styles.notice}>
          <strong>기본 흐름</strong>
          <p>
            Notion에서 학생별 페이지를 준비한 뒤, settings에서 짧은 주소를 만들고, 필요한 공지를
            등록한 다음 학생에게 링크를 전달하면 됩니다.
          </p>
        </section>

        <section className={styles.grid} aria-label="사이트 기능 사용법">
          {guideSections.map((section) => (
            <article className={styles.panel} key={section.title}>
              <h2>{section.title}</h2>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className={styles.checklist} aria-labelledby="checklist-title">
          <div>
            <p className={styles.kicker}>Before Sharing</p>
            <h2 id="checklist-title">학생에게 보내기 전 확인</h2>
          </div>
          <ol>
            {quickChecks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}
