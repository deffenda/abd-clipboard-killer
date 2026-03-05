type MockRecord = {
  recordId: string;
  fieldData: Record<string, unknown>;
  portalData?: Record<string, Array<Record<string, unknown>>>;
};

type MockLayout = {
  fields: string[];
  records: MockRecord[];
};

type MockStore = {
  layouts: Record<string, MockLayout>;
};

const store: MockStore = {
  layouts: {
    Contacts: {
      fields: ["FirstName", "LastName", "Email", "Phone"],
      records: [
        {
          recordId: "1",
          fieldData: {
            FirstName: "Ada",
            LastName: "Lovelace",
            Email: "ada@example.com",
            Phone: "555-1000"
          },
          portalData: {
            Notes: [
              {
                id: "n1",
                Note: "Met at conference"
              }
            ]
          }
        },
        {
          recordId: "2",
          fieldData: {
            FirstName: "Grace",
            LastName: "Hopper",
            Email: "grace@example.com",
            Phone: "555-2000"
          },
          portalData: {
            Notes: [
              {
                id: "n2",
                Note: "Follow up in April"
              }
            ]
          }
        }
      ]
    }
  }
};

const getLayout = (layout: string): MockLayout => {
  if (store.layouts[layout] === undefined) {
    store.layouts[layout] = {
      fields: [],
      records: []
    };
  }

  return store.layouts[layout];
};

const nextRecordId = (layout: string): string => {
  const records = getLayout(layout).records;
  const max = records.reduce((acc: number, item: MockRecord) => {
    return Math.max(acc, Number(item.recordId));
  }, 0);

  return String(max + 1);
};

export const mockFileMakerStore = {
  login: () => Promise.resolve({ token: "mock-token" }),
  logout: () => Promise.resolve({ ok: true }),
  getLayouts: () => Promise.resolve(Object.keys(store.layouts)),
  getFields: (layout: string) => Promise.resolve([...getLayout(layout).fields]),
  getRecords: (layout: string, limit: number, offset: number) => {
    const records = getLayout(layout).records;

    return Promise.resolve({
      data: records.slice(offset, offset + limit),
      totalCount: records.length
    });
  },
  getRecordById: (layout: string, recordId: string) => {
    const records = getLayout(layout).records;

    return Promise.resolve(records.find((record) => record.recordId === recordId) ?? null);
  },
  createRecord: (layout: string, data: Record<string, unknown>) => {
    const layoutStore = getLayout(layout);

    if (layoutStore.fields.length === 0) {
      layoutStore.fields = Object.keys(data);
    }

    const next: MockRecord = {
      recordId: nextRecordId(layout),
      fieldData: data
    };

    layoutStore.records.push(next);

    return Promise.resolve(next);
  },
  updateRecord: (layout: string, recordId: string, data: Record<string, unknown>) => {
    const records = getLayout(layout).records;
    const target = records.find((record) => record.recordId === recordId);

    if (target === undefined) {
      return Promise.resolve(null);
    }

    target.fieldData = {
      ...target.fieldData,
      ...data
    };

    return Promise.resolve(target);
  },
  deleteRecord: (layout: string, recordId: string) => {
    const records = getLayout(layout).records;
    const index = records.findIndex((record) => record.recordId === recordId);

    if (index === -1) {
      return Promise.resolve(false);
    }

    records.splice(index, 1);
    return Promise.resolve(true);
  },
  find: (layout: string, query: Array<Record<string, unknown>>, limit = 20, offset = 0) => {
    const records = getLayout(layout).records;

    const filtered = records.filter((record) => {
      return query.every((clause) => {
        return Object.entries(clause).every(([field, value]) => {
          const current = record.fieldData[field];
          return String(current ?? "")
            .toLowerCase()
            .includes(String(value).toLowerCase());
        });
      });
    });

    return Promise.resolve({
      data: filtered.slice(offset, offset + limit),
      totalCount: filtered.length
    });
  },
  runScript: (layout: string, scriptName: string, parameter?: string) => {
    return Promise.resolve({
      layout,
      scriptName,
      parameter,
      result: "mock-script-ok"
    });
  },
  upsertPortalRow: async (
    layout: string,
    recordId: string,
    relatedSet: string,
    row: Record<string, unknown>
  ) => {
    const target = await mockFileMakerStore.getRecordById(layout, recordId);
    if (target === null) {
      return null;
    }

    const rows = target.portalData?.[relatedSet] ?? [];
    const idValue = row.id;
    const id = typeof idValue === "string" ? idValue : `portal-${rows.length + 1}`;
    const payload = { ...row, id };

    const existing = rows.findIndex((item: Record<string, unknown>) => String(item.id) === id);

    if (existing >= 0) {
      rows[existing] = payload;
    } else {
      rows.push(payload);
    }

    target.portalData = {
      ...(target.portalData ?? {}),
      [relatedSet]: rows
    };

    return payload;
  },
  deletePortalRow: async (layout: string, recordId: string, relatedSet: string, rowId: string) => {
    const target = await mockFileMakerStore.getRecordById(layout, recordId);
    if (target === null) {
      return false;
    }

    const rows = target.portalData?.[relatedSet] ?? [];
    const index = rows.findIndex((item: Record<string, unknown>) => String(item.id) === rowId);

    if (index === -1) {
      return false;
    }

    rows.splice(index, 1);

    target.portalData = {
      ...(target.portalData ?? {}),
      [relatedSet]: rows
    };

    return true;
  }
};
