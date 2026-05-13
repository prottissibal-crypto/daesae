'use client';

import dynamic from 'next/dynamic';
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType
} from 'react';
import type {
  Block,
  Collection as NotionCollection,
  CollectionQueryResult,
  CollectionView,
  CollectionViewBlock,
  CollectionViewPageBlock,
  ExtendedRecordMap,
  FormattedDate,
  PageBlock
} from 'notion-types';
import {
  getBlockCollectionId,
  getBlockValue,
  getDateValue,
  getTextContent
} from 'notion-utils';
import { NotionRenderer } from 'react-notion-x';

type CollectionBlock = CollectionViewBlock | CollectionViewPageBlock | PageBlock;

interface CollectionComponentProps {
  block: CollectionBlock;
  className?: string;
  ctx: {
    recordMap: ExtendedRecordMap;
    mapPageUrl?: (pageId: string, recordMap?: ExtendedRecordMap) => string;
    showCollectionViewDropdown?: boolean;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  href: string;
}

const Code = dynamic(
  () => import('react-notion-x/third-party/code').then((mod) => mod.Code),
  { ssr: false }
);
const OriginalCollection = dynamic<CollectionComponentProps>(
  () =>
    import('react-notion-x/third-party/collection').then(
      (mod) => mod.Collection as ComponentType<CollectionComponentProps>
    ),
  { ssr: false }
);
const Equation = dynamic(
  () => import('react-notion-x/third-party/equation').then((mod) => mod.Equation),
  { ssr: false }
);
const Modal = dynamic(
  () => import('react-notion-x/third-party/modal').then((mod) => mod.Modal),
  { ssr: false }
);

function Collection(props: CollectionComponentProps) {
  const { block, ctx } = props;

  if (block.type === 'page') {
    return <OriginalCollection {...props} />;
  }

  const recordMap = ctx.recordMap;
  const viewIds = block.view_ids || [];
  const defaultViewId = viewIds[0];
  const storageKey = `notion-collection-view:${block.id}`;
  const [selectedViewId, setSelectedViewId] = useState(defaultViewId);

  useEffect(() => {
    const savedViewId = window.localStorage.getItem(storageKey);
    if (savedViewId && viewIds.includes(savedViewId)) {
      setSelectedViewId(savedViewId);
    } else {
      setSelectedViewId(defaultViewId);
    }
  }, [defaultViewId, storageKey, viewIds]);

  const collectionId = getBlockCollectionId(block, recordMap);
  const collection = collectionId
    ? getBlockValue(recordMap.collection[collectionId])
    : undefined;
  const collectionView = selectedViewId
    ? getBlockValue(recordMap.collection_view[selectedViewId])
    : undefined;
  const collectionData =
    collectionId && selectedViewId
      ? recordMap.collection_query[collectionId]?.[selectedViewId]
      : undefined;

  const onChangeView = (viewId: string) => {
    setSelectedViewId(viewId);
    window.localStorage.setItem(storageKey, viewId);
  };

  if (collectionView?.type !== 'calendar' || !collection || !collectionData) {
    return (
      <>
        <CollectionViewTabs
          collectionViewId={selectedViewId}
          ctx={ctx}
          onChangeView={onChangeView}
          viewIds={viewIds}
        />
        <OriginalCollection
          {...props}
          block={{
            ...block,
            view_ids: selectedViewId ? [selectedViewId] : viewIds
          }}
        />
      </>
    );
  }

  return (
    <>
      <CollectionViewTabs
        collectionViewId={selectedViewId}
        ctx={ctx}
        onChangeView={onChangeView}
        viewIds={viewIds}
      />
      <CalendarCollectionView
        block={block}
        collection={collection}
        collectionData={collectionData}
        collectionView={collectionView}
        ctx={ctx}
      />
    </>
  );
}

function CollectionViewTabs({
  collectionViewId,
  ctx,
  onChangeView,
  viewIds
}: {
  collectionViewId?: string;
  ctx: CollectionComponentProps['ctx'];
  onChangeView: (viewId: string) => void;
  viewIds: string[];
}) {
  if (viewIds.length <= 1 || ctx.showCollectionViewDropdown === false) {
    return null;
  }

  return (
    <div className="notion-collection-view-tabs-row">
      {viewIds.map((viewId) => {
        const collectionView = getBlockValue(ctx.recordMap.collection_view[viewId]);
        if (!collectionView) return null;

        const name =
          collectionView.name ||
          `${collectionView.type[0].toUpperCase()}${collectionView.type.slice(1)} view`;

        return (
          <button
            className={[
              'notion-collection-view-tabs-content-item',
              collectionViewId === viewId ? 'notion-collection-view-tabs-content-item-active' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            key={viewId}
            onClick={() => onChangeView(viewId)}
            type="button"
          >
            <span className="notion-collection-view-type">{name}</span>
          </button>
        );
      })}
    </div>
  );
}

function CalendarCollectionView({
  block,
  collection,
  collectionData,
  collectionView,
  ctx
}: {
  block: CollectionViewBlock | CollectionViewPageBlock;
  collection: NotionCollection;
  collectionData: CollectionQueryResult;
  collectionView: CollectionView;
  ctx: CollectionComponentProps['ctx'];
}) {
  const events = useMemo(
    () => getCalendarEvents(collection, collectionView, collectionData, ctx),
    [collection, collectionData, collectionView, ctx]
  );
  const initialMonth = useMemo(() => getInitialMonth(events), [events]);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);

  useEffect(() => {
    setVisibleMonth(initialMonth);
  }, [initialMonth]);

  const days = useMemo(() => getCalendarGridDays(visibleMonth), [visibleMonth]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const title = getTextContent(collection.name).trim();
  const blockFormat = block.format as { hide_inline_collection_name?: boolean } | undefined;
  const showTitle =
    blockFormat?.hide_inline_collection_name !== true &&
    collectionView.format?.hide_linked_collection_name !== true &&
    title;

  return (
    <div className="notion-collection">
      {showTitle && (
        <div className="notion-collection-header">
          <div className="notion-collection-header-title">{title}</div>
        </div>
      )}

      <div className="notion-calendar-fallback">
        <div className="notion-calendar-toolbar">
          <button
            aria-label="Previous month"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            type="button"
          >
            &lt;
          </button>
          <strong>{formatMonth(visibleMonth)}</strong>
          <button
            aria-label="Next month"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            type="button"
          >
            &gt;
          </button>
        </div>

        <div className="notion-calendar-grid">
          {['\uc77c', '\uc6d4', '\ud654', '\uc218', '\ubaa9', '\uae08', '\ud1a0'].map((weekday) => (
            <div className="notion-calendar-weekday" key={weekday}>
              {weekday}
            </div>
          ))}

          {days.map((day) => {
            const key = toDateKey(day);
            const dayEvents = eventsByDate.get(key) || [];
            const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();

            return (
              <div
                className={[
                  'notion-calendar-day',
                  isCurrentMonth ? '' : 'notion-calendar-day-muted'
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={key}
              >
                <div className="notion-calendar-day-number">{day.getDate()}</div>
                {dayEvents.map((event) => (
                  <a className="notion-calendar-event" href={event.href} key={event.id}>
                    {event.title}
                  </a>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .notion-calendar-fallback {
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          padding: 8px 0 24px;
          width: 100%;
        }

        .notion-calendar-toolbar {
          align-items: center;
          display: flex;
          gap: 12px;
          justify-content: center;
          margin: 8px 0 16px;
        }

        .notion-calendar-toolbar button {
          align-items: center;
          background: var(--bg-color);
          border: 1px solid var(--bg-color-2);
          border-radius: 4px;
          color: var(--fg-color);
          cursor: pointer;
          display: inline-flex;
          height: 30px;
          justify-content: center;
          width: 30px;
        }

        .notion-calendar-grid {
          border-left: 1px solid var(--bg-color-2);
          border-top: 1px solid var(--bg-color-2);
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          max-width: 100%;
          min-width: 0;
          width: 100%;
        }

        .notion-calendar-weekday,
        .notion-calendar-day {
          border-bottom: 1px solid var(--bg-color-2);
          border-right: 1px solid var(--bg-color-2);
          min-width: 0;
        }

        .notion-calendar-weekday {
          color: var(--fg-color-5);
          font-size: 13px;
          font-weight: 500;
          overflow: hidden;
          padding: 8px 4px;
          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notion-calendar-day {
          min-height: clamp(76px, 13vw, 112px);
          overflow: hidden;
          padding: clamp(3px, 0.9vw, 7px);
        }

        .notion-calendar-day-muted {
          background: var(--bg-color-1);
          color: var(--fg-color-5);
        }

        .notion-calendar-day-number {
          font-size: 12px;
          line-height: 18px;
          margin-bottom: 4px;
        }

        .notion-calendar-event {
          background: var(--bg-color-2);
          border-radius: 4px;
          color: var(--fg-color);
          display: -webkit-box;
          font-size: clamp(10px, 1.5vw, 12px);
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          line-height: 1.35;
          margin-top: 4px;
          overflow: hidden;
          padding: 3px 5px;
          text-decoration: none;
          word-break: break-word;
        }

        @media (max-width: 520px) {
          .notion-calendar-toolbar {
            gap: 8px;
            margin: 4px 0 12px;
          }

          .notion-calendar-weekday {
            font-size: 11px;
            padding: 6px 2px;
          }

          .notion-calendar-day-number {
            font-size: 11px;
            line-height: 15px;
          }

          .notion-calendar-event {
            border-radius: 3px;
            margin-top: 3px;
            padding: 2px 3px;
          }
        }
      `}</style>
    </div>
  );
}

function getCalendarEvents(
  collection: NotionCollection,
  collectionView: CollectionView,
  collectionData: CollectionQueryResult,
  ctx: CollectionComponentProps['ctx']
): CalendarEvent[] {
  const datePropertyId = getCalendarDatePropertyId(collection, collectionView);
  const blockIds = collectionData.collection_group_results?.blockIds || collectionData.blockIds || [];

  const events: CalendarEvent[] = [];

  for (const blockId of blockIds) {
      const block = getBlockValue(ctx.recordMap.block[blockId]);
    if (!block || block.type !== 'page') continue;

      const date = getBlockDate(block, collection, datePropertyId);
    if (!date) continue;

      const href =
        ctx.mapPageUrl?.(block.id, ctx.recordMap) || `/${block.id.replace(/-/g, '')}`;

    events.push({
      id: block.id,
      title: getTextContent(block.properties?.title) || 'Untitled',
      start: date.start,
      ...(date.end ? { end: date.end } : {}),
      href
    });
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function getCalendarDatePropertyId(
  collection: NotionCollection,
  collectionView: CollectionView
) {
  const format = collectionView.format || {};
  const candidates = [
    format.calendar_by,
    format.calendar_by_property,
    format.date_property,
    format.calendar_date_property,
    format.calendar?.property,
    format.calendar?.date_property
  ];

  for (const candidate of candidates) {
    const propertyId =
      typeof candidate === 'string'
        ? candidate
        : typeof candidate?.property === 'string'
          ? candidate.property
          : undefined;

    if (propertyId && collection.schema[propertyId]) {
      return propertyId;
    }
  }

  return Object.keys(collection.schema).find(
    (propertyId) => collection.schema[propertyId]?.type === 'date'
  );
}

function getBlockDate(
  block: PageBlock,
  collection: NotionCollection,
  datePropertyId?: string
) {
  const propertyIds = [
    datePropertyId,
    ...Object.keys(collection.schema).filter(
      (propertyId) =>
        propertyId !== datePropertyId && collection.schema[propertyId]?.type === 'date'
    )
  ].filter(Boolean) as string[];

  for (const propertyId of propertyIds) {
    const properties = block.properties as Record<string, unknown> | undefined;
    const date = getDateFromProperty(properties?.[propertyId]);
    if (date) return date;
  }

  return null;
}

function getDateFromProperty(property?: unknown) {
  if (!Array.isArray(property)) return null;

  const notionDate = getDateValue(property as unknown[]);
  if (!notionDate) return null;

  return parseNotionDate(notionDate);
}

function parseNotionDate(notionDate: FormattedDate) {
  const start = parseLocalDate(notionDate.start_date, notionDate.start_time);
  const end = notionDate.end_date
    ? parseLocalDate(notionDate.end_date, notionDate.end_time)
    : undefined;

  return start ? { start, end } : null;
}

function parseLocalDate(date: string, time?: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;

  const [hour = 0, minute = 0] = time?.split(':').map(Number) || [];
  return new Date(year, month - 1, day, hour, minute);
}

function getInitialMonth(events: CalendarEvent[]) {
  return events[0] ? startOfMonth(events[0].start) : startOfMonth(new Date());
}

function getCalendarGridDays(month: Date) {
  const firstDay = startOfMonth(month);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function groupEventsByDate(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    for (const day of getEventDays(event)) {
      const key = toDateKey(day);
      map.set(key, [...(map.get(key) || []), event]);
    }
  }

  return map;
}

function getEventDays(event: CalendarEvent) {
  const days: Date[] = [];
  const start = startOfDay(event.start);
  const end = event.end ? startOfDay(event.end) : start;
  const maxDays = 366;

  for (
    let day = new Date(start), count = 0;
    day <= end && count < maxDays;
    day.setDate(day.getDate() + 1), count += 1
  ) {
    days.push(new Date(day));
  }

  return days;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}\ub144 ${date.getMonth() + 1}\uc6d4`;
}

interface NotionPageProps {
  recordMap: ExtendedRecordMap;
}

export default function NotionPage({ recordMap }: NotionPageProps) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('daesae-theme');
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    if (storedTheme === 'dark' || storedTheme === 'light') {
      setDarkMode(storedTheme === 'dark');
    } else {
      setDarkMode(media.matches);
    }

    const onChange = (event: MediaQueryListEvent) => {
      if (!window.localStorage.getItem('daesae-theme')) {
        setDarkMode(event.matches);
      }
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  const onToggleTheme = () => {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    window.localStorage.setItem('daesae-theme', nextDarkMode ? 'dark' : 'light');
  };

  return (
    <div className={`notion-viewer ${darkMode ? 'dark-mode' : ''}`}>
      <button
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="theme-toggle"
        onClick={onToggleTheme}
        type="button"
      >
        {darkMode ? 'Light' : 'Dark'}
      </button>
      <NotionRenderer
        recordMap={recordMap}
        darkMode={darkMode}
        fullPage
        mapPageUrl={(pageId) => `/${pageId.replace(/-/g, '')}`}
        components={{
          Code,
          Collection,
          Equation,
          Modal
        }}
        showCollectionViewDropdown
        showTableOfContents
      />
    </div>
  );
}
