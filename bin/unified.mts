import util from 'node:util';

export type BSONDocument = Record<string, any>;

export class UnifiedTestSuite {
  tests: UnifiedTest[];

  constructor(
    public source: { filePath: string; sourceType: 'json' | 'yml' },
    private raw: { schemaVersion: string } & Record<string, any>
  ) {
    this.tests = this.raw.tests.map((test: any) => new UnifiedTest(this, test));
  }

  get description(): string[] {
    return this.raw.description;
  }

  get schemaVersion(): string {
    return this.raw.schemaVersion;
  }

  get runOnRequirements() {
    return this.raw.runOnRequirements ?? [];
  }

  get createEntities() {
    return this.raw.createEntities ?? [];
  }

  get initialData(): { collectionName: string; databaseName: string; documents: BSONDocument[] }[] {
    return this.raw.initialData ?? [];
  }

  get _yamlAnchors() {
    return this.raw._yamlAnchors;
  }
}

export class UnifiedTest {
  constructor(public parent: UnifiedTestSuite, private raw: { description: string } & Record<string, any>) {}

  get description() {
    return this.raw.description;
  }

  // Suite properties that are "copied" for each test:

  /** Tests can also declare their own runOnRequirements which are supposed to be merged with the suite */
  get runOnRequirements() {
    return [...this.parent.runOnRequirements, ...(this.raw.runOnRequirements ?? [])];
  }

  /** Entities that will be created before each test case is executed */
  get createEntities() {
    return this.parent.createEntities;
  }

  /** Data that will exist in collections before each test case is executed */
  get initialData() {
    return this.parent.initialData;
  }

  equals(otherTest: UnifiedTest | null | undefined): boolean;
  equals(otherTest: UnifiedTest | null | undefined, returnReason: true): { isEqual: boolean; reason: string };
  equals(
    otherTest: UnifiedTest | null | undefined,
    returnReason = false
  ): boolean | { isEqual: boolean; reason: string } {
    if (otherTest == null) {
      return returnReason ? { isEqual: false, reason: 'otherTest is null' } : false;
    }

    let isEqual = true;
    let reason = null;

    isEqual &&= this.parent.description === otherTest.parent.description;
    if (!isEqual && reason == null) reason = 'suite descriptions do not match';

    isEqual &&= this.description === otherTest.description;
    if (!isEqual && reason == null) reason = 'test descriptions do not match';

    isEqual &&= util.isDeepStrictEqual(this.runOnRequirements, otherTest.runOnRequirements);
    if (!isEqual && reason == null) reason = 'runOnRequirements do not match';

    isEqual &&= util.isDeepStrictEqual(this.createEntities, otherTest.createEntities);
    if (!isEqual && reason == null) reason = 'createEntities do not match';

    isEqual &&= util.isDeepStrictEqual(this.initialData, otherTest.initialData);
    if (!isEqual && reason == null) reason = 'initialData do not match';

    isEqual &&= util.isDeepStrictEqual(this.raw, otherTest.raw);
    if (!isEqual && reason == null) reason = 'test contents do not match';

    return returnReason ? { isEqual, reason: reason ?? '' } : isEqual;
  }

  /**
   * Returns a plain object that satisfies a unified schema file
   * So this is a "unified suite" but with only `this` test.
   */
  toJSON() {
    return {
      description: this.parent.description,
      schemaVersion: this.parent.schemaVersion,
      runOnRequirements: this.parent.runOnRequirements,
      createEntities: this.parent.createEntities,
      initialData: this.parent.initialData,
      _yamlAnchors: this.parent._yamlAnchors,
      tests: [this.raw]
    }
  }
}
