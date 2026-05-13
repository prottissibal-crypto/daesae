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
  CollectionPropertySchema,
  CollectionQueryResult,
  CollectionView,
  CollectionViewBlock,
  CollectionViewPageBlock,
  Decoration,
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

interface PropertyComponentProps {
  propertyId?: string;
  schema?: CollectionPropertySchema;
  data?: Decoration[];
  block?: Block;
  collection?: NotionCollection;
  inline?: boolean;
  linkToTitlePage?: boolean;
  pageHeader?: boolean;
}

interface CalendarEventProperty {
  id: string;
  schema: CollectionPropertySchema;
  data?: Decoration[];
}

interface CalendarEvent {
  block: PageBlock;
  id: string;
  properties: CalendarEventProperty[];
  title: string;
  startKey: string;
  endKey?: string;
  href: string;
}

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  key: string;
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
const Property = dynamic<PropertyComponentProps>(
  () =>
    import('react-notion-x/third-party/collection').then(
      (mod) => mod.Property as ComponentType<PropertyComponentProps>
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
  const rendererCollectionData = useMemo(
    () =>
      collection && collectionView && collectionData
        ? normalizeGroupedCollectionData(collection, collectionView, collectionData, recordMap)
        : collectionData,
    [collection, collectionData, collectionView, recordMap]
  );
  const rendererCtx = useMemo(() => {
    if (
      !collectionId ||
      !selectedViewId ||
      !rendererCollectionData ||
      rendererCollectionData === collectionData
    ) {
      return ctx;
    }

    return {
      ...ctx,
      recordMap: {
        ...recordMap,
        collection_query: {
          ...recordMap.collection_query,
          [collectionId]: {
            ...recordMap.collection_query[collectionId],
            [selectedViewId]: rendererCollectionData
          }
        }
      }
    };
  }, [collectionData, collectionId, ctx, recordMap, rendererCollectionData, selectedViewId]);

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
          ctx={rendererCtx}
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
  const initialMonthKey = useMemo(() => getCurrentMonthKey(), [collectionView.id]);
  const [visibleMonthState, setVisibleMonthState] = useState({
    monthKey: initialMonthKey,
    viewId: collectionView.id
  });

  useEffect(() => {
    setVisibleMonthState((current) =>
      current.viewId === collectionView.id
        ? current
        : {
            monthKey: initialMonthKey,
            viewId: collectionView.id
          }
    );
  }, [collectionView.id, initialMonthKey]);

  const visibleMonthKey = visibleMonthState.monthKey;
  const setVisibleMonthKey = (monthKey: string) => {
    setVisibleMonthState({
      monthKey,
      viewId: collectionView.id
    });
  };
  const [todayKey, setTodayKey] = useState<string | null>(null);

  useEffect(() => {
    const updateToday = () => setTodayKey(getCurrentDateKey());

    updateToday();
    const interval = window.setInterval(updateToday, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const goToToday = () => {
    const currentDateKey = todayKey || getCurrentDateKey();
    setVisibleMonthKey(currentDateKey.slice(0, 7));
  };

  const days = useMemo(() => getCalendarGridDays(visibleMonthKey), [visibleMonthKey]);
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
        <div className="notion-collection-header notion-collection-header-with-action">
          <div className="notion-collection-header-title">{title}</div>

          <a
            aria-label="Instagram 바로가기"
            className="notion-instagram-logo-button"
            href="https://www.instagram.com/daese_english/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="18"
              viewBox="0 0 24 24"
              width="18"
            >
              <rect
                height="16"
                rx="5"
                stroke="currentColor"
                strokeWidth="2"
                width="16"
                x="4"
                y="4"
              />
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="17" cy="7" fill="currentColor" r="1.2" />
            </svg>
          </a>
        </div>
      )}

      <div className="notion-calendar-fallback">
        <div className="notion-calendar-toolbar">
          <button
            aria-label="Previous month"
            onClick={() => setVisibleMonthKey(addMonths(visibleMonthKey, -1))}
            type="button"
          >
            &lt;
          </button>
          <button
            aria-label="Go to today"
            className="notion-calendar-today-button"
            onClick={goToToday}
            type="button"
          >
            {'\uc624\ub298'}
          </button>
          <strong>{formatMonth(visibleMonthKey)}</strong>
          <button
            aria-label="Next month"
            onClick={() => setVisibleMonthKey(addMonths(visibleMonthKey, 1))}
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
            const dayEvents = eventsByDate.get(day.key) || [];

            return (
              <div
                className={[
                  'notion-calendar-day',
                  day.isCurrentMonth ? '' : 'notion-calendar-day-muted',
                  day.key === todayKey ? 'notion-calendar-day-today' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={day.key}
              >
                <div className="notion-calendar-day-number">{day.day}</div>
                {dayEvents.map((event) => (
                  <a className="notion-calendar-event" href={event.href} key={event.id}>
                    <span className="notion-calendar-event-title">{event.title}</span>
                    {event.properties.length > 0 && (
                      <span className="notion-calendar-event-properties">
                        {event.properties.map((property) => (
                          <span className="notion-calendar-event-property" key={property.id}>
                            <Property
                              block={event.block}
                              collection={collection}
                              data={property.data}
                              inline
                              linkToTitlePage={false}
                              propertyId={property.id}
                              schema={property.schema}
                            />
                          </span>
                        ))}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .notion-collection-header-with-action {
          align-items: center;
          display: flex;
          gap: 10px;
          justify-content: space-between;
        }

        .notion-instagram-logo-button {
          align-items: center;
          border: 1px solid var(--bg-color-2);
          border-radius: 999px;
          color: var(--fg-color);
          display: inline-flex;
          flex: 0 0 auto;
          height: 34px;
          justify-content: center;
          text-decoration: none;
          transition:
            background 120ms ease,
            border-color 120ms ease,
            transform 120ms ease;
          width: 34px;
        }

        .notion-instagram-logo-button:hover {
          background: var(--bg-color-1);
          border-color: var(--fg-color-5);
          transform: translateY(-1px);
        }

        .notion-calendar-fallback {
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 8px 0 24px;
          scrollbar-gutter: stable;
          -webkit-overflow-scrolling: touch;
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

        .notion-calendar-toolbar .notion-calendar-today-button {
          font-weight: 500;
          padding: 0 10px;
          width: auto;
        }

        .notion-calendar-grid {
          border-left: 1px solid var(--bg-color-2);
          border-top: 1px solid var(--bg-color-2);
          display: grid;
          grid-template-columns: repeat(7, minmax(112px, 1fr));
          min-width: 784px;
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
          min-height: 112px;
          overflow: hidden;
          padding: 7px;
        }

        .notion-calendar-day-muted {
          background: var(--bg-color-1);
          color: var(--fg-color-5);
        }

        .notion-calendar-day-today {
          background: rgba(46, 170, 220, 0.08);
          box-shadow: inset 0 0 0 1px var(--notion-blue);
        }

        .notion-calendar-day-number {
          font-size: 12px;
          line-height: 18px;
          margin-bottom: 4px;
        }

        .notion-calendar-day-today .notion-calendar-day-number {
          align-items: center;
          background: var(--notion-blue);
          border-radius: 999px;
          color: #fff;
          display: inline-flex;
          font-weight: 600;
          height: 22px;
          justify-content: center;
          margin-bottom: 2px;
          width: 22px;
        }

        .notion-calendar-event {
          background: var(--bg-color-1);
          border: 1px solid var(--bg-color-2);
          border-radius: 4px;
          color: var(--fg-color);
          display: block;
          font-size: clamp(10px, 1.5vw, 12px);
          line-height: 1.35;
          margin-top: 4px;
          min-width: 0;
          overflow: hidden;
          padding: 3px 5px;
          text-decoration: none;
          word-break: break-word;
        }

        .notion-calendar-event-title {
          display: block;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notion-calendar-event-properties {
          display: flex;
          flex-wrap: wrap;
          gap: 3px 4px;
          margin-top: 3px;
          min-width: 0;
          overflow: hidden;
        }

        .notion-calendar-event-property {
          display: inline-flex;
          max-width: 100%;
          min-width: 0;
        }

        .notion-calendar-event-property :global(.notion-property) {
          align-items: center;
          color: var(--fg-color-5);
          display: inline-flex;
          font-size: 11px;
          line-height: 1.25;
          max-width: 100%;
          min-width: 0;
        }

        .notion-calendar-event-property :global(.notion-property-select-item),
        .notion-calendar-event-property :global(.notion-property-multi_select-item),
        .notion-calendar-event-property :global(.notion-property-status-item) {
          align-items: center;
          display: inline-flex;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 860px) {
          .notion-calendar-grid {
            width: 784px;
          }
        }
      `}</style>
    </div>
  );
}

type CollectionDataWithGroupResults = CollectionQueryResult & Record<string, unknown>;

interface CollectionGroupFormat {
  hidden?: boolean;
  property?: string;
  value?: {
    type?: string;
    value?: unknown;
  };
}

function normalizeGroupedCollectionData(
  collection: NotionCollection,
  collectionView: CollectionView,
  collectionData: CollectionQueryResult,
  recordMap: ExtendedRecordMap
) {
  const groupBy = collectionView.format?.collection_group_by;
  const groups = collectionView.format?.collection_groups as CollectionGroupFormat[] | undefined;

  if (!groupBy || !Array.isArray(groups) || !groups.length) {
    return collectionData;
  }

  const collectionDataWithGroups = collectionData as CollectionDataWithGroupResults;
  const missingGroups = groups.filter((group) => {
    const key = getCollectionGroupResultKey(group);
    return key && !collectionDataWithGroups[key];
  });

  if (!missingGroups.length) {
    return collectionData;
  }

  const blockIds =
    collectionData.collection_group_results?.blockIds || collectionData.blockIds || [];

  if (!blockIds.length) {
    return collectionData;
  }

  const normalizedData: CollectionDataWithGroupResults = { ...collectionData };

  for (const group of missingGroups) {
    const key = getCollectionGroupResultKey(group);

    if (!key) continue;

    const groupBlockIds = blockIds.filter((blockId) => {
      const block = getBlockValue(recordMap.block[blockId]);
      return block?.type === 'page' && blockMatchesCollectionGroup(block, group);
    });

    normalizedData[key] = {
      aggregationResults: [],
      blockIds: groupBlockIds,
      collection_group_results: {
        blockIds: groupBlockIds,
        hasMore: false,
        type: 'results'
      },
      hasMore: false,
      total: groupBlockIds.length,
      type: 'table'
    } as CollectionQueryResult;
  }

  return normalizedData as CollectionQueryResult;
}

function getCollectionGroupResultKey(group: CollectionGroupFormat) {
  const type = group.value?.type;

  if (!type) {
    return null;
  }

  const queryLabel = getCollectionGroupQueryLabel(group.value?.value);

  if (!queryLabel) {
    return null;
  }

  return `results:${type}:${queryLabel}`;
}

function getCollectionGroupQueryLabel(value: unknown) {
  if (value === undefined) {
    return 'uncategorized';
  }

  if (isDateRangeValue(value)) {
    return value.range.start_date || value.range.end_date || null;
  }

  if (typeof value === 'object' && value && 'value' in value) {
    const nestedValue = (value as { value?: unknown }).value;
    return nestedValue === undefined ? null : String(nestedValue);
  }

  return String(value);
}

function blockMatchesCollectionGroup(block: PageBlock, group: CollectionGroupFormat) {
  const propertyId = group.property;
  const type = group.value?.type;

  if (!propertyId || !type) {
    return false;
  }

  const properties = block.properties as Record<string, Decoration[] | undefined> | undefined;
  const data = properties?.[propertyId];
  const expectedValue = group.value?.value;

  if (expectedValue === undefined) {
    return isEmptyPropertyData(data);
  }

  const textValue = getTextContent(data || []).trim();

  switch (type) {
    case 'checkbox':
      return textValue === (expectedValue ? 'Yes' : 'No');
    case 'date': {
      if (!isDateRangeValue(expectedValue)) {
        return false;
      }

      const date = getDateFromProperty(data);
      return (
        date?.startKey === expectedValue.range.start_date ||
        date?.endKey === expectedValue.range.end_date
      );
    }
    case 'multi_select':
      return textValue
        .split(',')
        .map((value) => value.trim())
        .includes(String(expectedValue));
    case 'select':
    case 'status':
    default:
      return textValue === String(expectedValue);
  }
}

function isEmptyPropertyData(data?: Decoration[]) {
  return !data || data.length === 0 || !getTextContent(data).trim();
}

function isDateRangeValue(value: unknown): value is {
  range: {
    end_date?: string;
    start_date?: string;
  };
} {
  return Boolean(
    typeof value === 'object' &&
      value &&
      'range' in value &&
      typeof (value as { range?: unknown }).range === 'object'
  );
}

function getCalendarEvents(
  collection: NotionCollection,
  collectionView: CollectionView,
  collectionData: CollectionQueryResult,
  ctx: CollectionComponentProps['ctx']
): CalendarEvent[] {
  const datePropertyId = getCalendarDatePropertyId(collection, collectionView);
  const visiblePropertyIds = getCalendarVisiblePropertyIds(
    collection,
    collectionView,
    datePropertyId
  );
  const blockIds = collectionData.collection_group_results?.blockIds || collectionData.blockIds || [];

  const events: CalendarEvent[] = [];

  for (const blockId of blockIds) {
    const block = getBlockValue(ctx.recordMap.block[blockId]);
    if (!block || block.type !== 'page') continue;

    const date = getBlockDate(block, collection, datePropertyId);
    if (!date) continue;

    const href =
      ctx.mapPageUrl?.(block.id, ctx.recordMap) || `/${block.id.replace(/-/g, '')}`;
    const blockProperties = block.properties as Record<string, Decoration[] | undefined> | undefined;
    const properties = visiblePropertyIds.flatMap((propertyId): CalendarEventProperty[] => {
      const schema = collection.schema[propertyId];
      const data = blockProperties?.[propertyId];

      if (!schema || !hasPropertyData(data)) {
        return [];
      }

      return [
        {
          id: propertyId,
          schema,
          data
        }
      ];
    });

    events.push({
      block,
      id: block.id,
      properties,
      title: getTextContent(block.properties?.title) || 'Untitled',
      startKey: date.startKey,
      ...(date.endKey ? { endKey: date.endKey } : {}),
      href
    });
  }

  return events.sort((a, b) => a.startKey.localeCompare(b.startKey));
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

function getCalendarVisiblePropertyIds(
  collection: NotionCollection,
  collectionView: CollectionView,
  datePropertyId?: string
) {
  const format = collectionView.format || {};
  const candidates = [
    format.calendar_properties,
    format.calendar_view_properties,
    format.visible_properties,
    format.properties
  ];

  for (const candidate of candidates) {
    const propertyIds = getVisiblePropertyIdsFromFormat(candidate).filter(
      (propertyId) =>
        propertyId !== 'title' &&
        propertyId !== datePropertyId &&
        Boolean(collection.schema[propertyId])
    );

    if (propertyIds.length) {
      return propertyIds;
    }
  }

  return Object.keys(collection.schema).filter((propertyId) => {
    const schema = collection.schema[propertyId];

    return (
      propertyId !== 'title' &&
      propertyId !== datePropertyId &&
      ['checkbox', 'date', 'multi_select', 'select', 'status'].includes(schema?.type)
    );
  });
}

function getVisiblePropertyIdsFromFormat(value: unknown) {
  if (!Array.isArray(value)) return [];

  const propertyIds = value.flatMap((item): string[] => {
    if (typeof item === 'string') {
      return [item];
    }

    if (!item || typeof item !== 'object') {
      return [];
    }

    const property = item as { property?: unknown; visible?: unknown };

    if (property.visible === false || typeof property.property !== 'string') {
      return [];
    }

    return [property.property];
  });

  return Array.from(new Set(propertyIds));
}

function hasPropertyData(data?: Decoration[]) {
  return Array.isArray(data) ? data.length > 0 : Boolean(data);
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
  if (!isDateKey(notionDate.start_date)) return null;

  return {
    startKey: notionDate.start_date,
    ...(notionDate.end_date && isDateKey(notionDate.end_date)
      ? { endKey: notionDate.end_date }
      : {})
  };
}

function getCalendarGridDays(monthKey: string): CalendarDay[] {
  const { month, year } = parseMonthKey(monthKey);
  const firstWeekday = getUtcWeekday(year, month, 1);
  const gridStart = Date.UTC(year, month - 1, 1 - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart + index * 86400000);
    const dateYear = date.getUTCFullYear();
    const dateMonth = date.getUTCMonth() + 1;
    const dateDay = date.getUTCDate();

    return {
      day: dateDay,
      isCurrentMonth: dateMonth === month,
      key: createDateKey(dateYear, dateMonth, dateDay)
    };
  });
}

function groupEventsByDate(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    for (const key of getEventDateKeys(event)) {
      map.set(key, [...(map.get(key) || []), event]);
    }
  }

  return map;
}

function getEventDateKeys(event: CalendarEvent) {
  const keys: string[] = [];
  const start = parseDateKey(event.startKey);
  const end = parseDateKey(event.endKey || event.startKey);
  const startTime = Date.UTC(start.year, start.month - 1, start.day);
  const endTime = Date.UTC(end.year, end.month - 1, end.day);
  const maxDays = 366;

  for (let time = startTime, count = 0; time <= endTime && count < maxDays; time += 86400000, count += 1) {
    const date = new Date(time);
    keys.push(createDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()));
  }

  return keys;
}

function getCurrentMonthKey() {
  return getCurrentDateKey().slice(0, 7);
}

function addMonths(monthKey: string, amount: number) {
  const { month, year } = parseMonthKey(monthKey);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return createMonthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

function createMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function createDateKey(year: number, month: number, day: number) {
  return `${createMonthKey(year, month)}-${String(day).padStart(2, '0')}`;
}

function getCurrentDateKey() {
  const now = new Date();
  return createDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function getUtcWeekday(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return { month, year };
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { day, month, year };
}

function formatMonth(monthKey: string) {
  const { month, year } = parseMonthKey(monthKey);
  return `${year}\ub144 ${month}\uc6d4`;
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
