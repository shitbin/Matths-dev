#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const {
  mongo: { MongoClient },
} = require("mongoose");

const rootDirectory = path.resolve(
  __dirname,
  ".."
);
const environmentPath = path.join(
  rootDirectory,
  "config.env"
);

if (fs.existsSync(environmentPath)) {
  require("dotenv").config({
    path: environmentPath,
    quiet: true,
  });
}

const isProduction =
  process.env.NODE_ENV === "production";
const LOCAL_MONGO_PORT = 27018;
const LOCAL_DB_NAME = "matths_dev";

let localMongo = null;
let shuttingDown = false;

function localReplicaUri(setName) {
  return `mongodb://127.0.0.1:${LOCAL_MONGO_PORT}/${LOCAL_DB_NAME}` +
    `?replicaSet=${encodeURIComponent(setName)}&directConnection=true`;
}

async function existingLocalReplicaUri() {
  const client = new MongoClient(
    `mongodb://127.0.0.1:${LOCAL_MONGO_PORT}/admin?directConnection=true`,
    {
      serverSelectionTimeoutMS: 1200,
      connectTimeoutMS: 1200,
    },
  );
  try {
    await client.connect();
    const hello = await client.db("admin").command({ hello: 1 });
    const setName = String(hello?.setName || "").trim();
    if (!setName || hello?.isWritablePrimary !== true) return null;
    return localReplicaUri(setName);
  } catch {
    return null;
  } finally {
    await client.close().catch(() => {});
  }
}

async function startLocalMongo() {
  const existingUri = await existingLocalReplicaUri();
  if (existingUri) {
    process.env.DB = existingUri;
    console.log(
      `기존 127.0.0.1:${LOCAL_MONGO_PORT} 로컬 레플리카셋을 사용합니다.`,
    );
    return;
  }

  const {
    MongoMemoryReplSet,
  } = require(
    "mongodb-memory-server"
  );
  const dataDirectory = path.join(
    rootDirectory,
    ".matths-dev-db"
  );

  fs.mkdirSync(dataDirectory, {
    recursive: true,
  });

  console.log(
    "Atlas에 연결할 수 없어 로컬 개발 DB로 자동 전환합니다."
  );
  console.log(
    "첫 실행에서는 MongoDB 실행 파일을 한 번 내려받아 잠시 걸릴 수 있습니다."
  );

  localMongo =
    await MongoMemoryReplSet.create({
      // 결제 발행·일수 원장·좌석 정산은 MongoDB 트랜잭션이 필수다.
      // 단일 개발 노드도 replica set으로 띄워 실기 검증이 운영과 같은
      // 원자성 계약을 사용하게 한다. 지정 dbPath는 기존 로컬 데이터를 보존한다.
      instanceOpts: [
        {
          dbName:
            "matths_dev",
          dbPath:
            dataDirectory,
          ip: "127.0.0.1",
          port: LOCAL_MONGO_PORT,
          storageEngine:
            "wiredTiger",
          portGeneration:
            false,
        },
      ],
      replSet: {
        count: 1,
        dbName:
          "matths_dev",
        ip: "127.0.0.1",
        name:
          "matths-dev-rs",
        storageEngine:
          "wiredTiger",
        dispose: {
          enabled: false,
        },
      },
    });

  process.env.DB =
    localMongo.getUri("matths_dev");
  console.log(
    "트랜잭션 가능한 로컬 개발 DB가 준비되었습니다. 데이터는 프로젝트의 개발 DB 폴더에 보존됩니다."
  );
}

async function shutdown(
  signal,
  exitCode = 0
) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (localMongo) {
    await localMongo
      .stop({
        doCleanup: true,
        force: false,
      })
      .catch((error) => {
        console.error(
          "로컬 개발 DB 종료 실패:",
          error.message
        );
      });
  }

  if (signal) {
    console.log(
      `${signal} 신호로 개발 서버를 종료합니다.`
    );
  }
  process.exit(exitCode);
}

async function main() {
  // `npm start`는 언제나 로컬 미리보기다. config.env의 Atlas가 우연히 살아 있다는
  // 이유만으로 학생 DB를 선택하면 클릭 테스트가 운영 데이터를 쓰게 된다.
  // 원격 개발 DB를 명시적으로 쓸 때만 `npm run start:atlas`로 server.js를 직접 연다.
  // 운영 환경은 절대 로컬 DB로 폴백하지 않는다.
  if (isProduction) {
    require("../server");
    return;
  }

  process.env.DISABLE_SCHEDULERS ||= "1";
  process.env.DISABLE_ARENA_PROBLEM_DATA_WATCHER ||= "1";
  process.env.DISABLE_ARENA_TIER_CATALOG_WATCHER ||= "1";
  await startLocalMongo();

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  require("../server");
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error(
      "개발 서버 시작 실패:",
      error
    );
    await shutdown(null, 1);
  });
}

module.exports = {
  existingLocalReplicaUri,
  localReplicaUri,
  startLocalMongo,
};
