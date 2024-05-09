const express = require("express");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
var ObjectId = require("mongodb").ObjectId;
const matchJSONData = require("./data/match.json");
const playersJSONData = require("./data/players.json");
app.use(express.json());

// Database Details
const DB_URI = process.env.DB_URI;
const DB_NAME = process.env.DB_NAME;
const DB_COLLECTION_NAME = process.env.DB_COLLECTION_NAME;

const client = new MongoClient(DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    db = client.db(DB_NAME);
    console.log("You successfully connected to MongoDB!");
  } finally {
  }
}
run();

// Endpoints
app.get("/get-all-team", async (req, res) => {
  const cursor = await db.collection(DB_COLLECTION_NAME).find();
  const data = [];
  for await (const doc of cursor) {
    data.push(doc);
  }
  res.status(200).json(data);
});

app.get("/process-result", async (req, res) => {
  const cursor = await db.collection(DB_COLLECTION_NAME).find();
  const data = [];
  const cursorData = [];
  for await (const doc of cursor) {
    var mp = new Map();
    for await (const player of doc.players) {
      mp.set(player.name, {
        runs: 0,
        points: 0,
        wicketCount: 0,
        catchCount: 0,
      });
    }
    data.push(mp);
    cursorData.push(doc);
  }

  for (let data1 of data) {
    let run_per_over = 0;
    let over_no = 0;
    let bowler_name = "";
    let flag = true;
    for (var i = 0; i < matchJSONData.length; i++) {
      if (matchJSONData[i].innings === 1) {
        let run_per_ball = matchJSONData[i].total_run;
        let batter = matchJSONData[i].batter;
        let bowler = matchJSONData[i].bowler;
        bowler_name = bowler;
        let fielders_involved = matchJSONData[i].fielders_involved;
        if (matchJSONData[i].isWicketDelivery) {
          if (data1.get(batter)) {
            let batter_run = data1.get(batter).runs;
            let batter_points = data1.get(batter).points;
            let batter_wicketCount = data1.get(batter).wicketCount;
            let batter_catchCount = data1.get(batter).catchCount;
            if (batter_run === 0) {
              batter_points += -2;
            }
            data1.set(batter, {
              runs: batter_run,
              points: batter_points,
              wicketCount: batter_wicketCount,
              catchCount: batter_catchCount,
            });
          }

          let kind = matchJSONData[i].kind.toLowerCase();
          if (data1.get(bowler)) {
            let bowler_runs = data1.get(bowler).runs;
            let bowler_points = data1.get(bowler).points;
            let bowler_wicketCount = data1.get(bowler).wicketCount;
            let bowler_catchCount = data1.get(bowler).catchCount;
            if (kind === "lbw" || kind === "bowled") {
              bowler_points += 8; //bonus points
              bowler_points += 25;
              bowler_wicketCount += 1;
            }
            if (kind === "caught") {
              bowler_points += 25;
              bowler_wicketCount += 1;
            }
            data1.set(bowler, {
              runs: bowler_runs,
              points: bowler_points,
              wicketCount: bowler_wicketCount,
              catchCount: bowler_catchCount,
            });
          }

          if (data1.get(fielders_involved)) {
            let fielders_run = data1.get(fielders_involved).runs;
            let fielders_points = data1.get(fielders_involved).points;
            let fielders_wicketCount = data1.get(fielders_involved).wicketCount;
            let fielders_catchCount = data1.get(fielders_involved).catchCount;
            if (kind === "caught") {
              fielders_points += 8;
              fielders_catchCount += 1;
            }
            if (kind === "stumping") fielders_points += 12;
            if (kind === "run out") fielders_points += 6;
            data1.set(fielders_involved, {
              runs: fielders_run,
              points: fielders_points,
              wicketCount: fielders_wicketCount,
              catchCount: fielders_catchCount,
            });
          }
        } else {
          if (data1.get(batter)) {
            let batter_run_on_ball = matchJSONData[i].batsman_run;
            let batter_run = data1.get(batter).runs;
            let batter_points = data1.get(batter).points;
            let batter_wicketCount = data1.get(batter).wicketCount;
            let batter_catchCount = data1.get(batter).catchCount;
            if (batter_run_on_ball === 4) {
              batter_run += 4;
              batter_points += 1; // bonus points
            } else if (batter_run_on_ball === 6) {
              batter_run += 6;
              batter_points += 2; // bonus points
            } else if (batter_run_on_ball !== 0) {
              batter_run += batter_run_on_ball;
              batter_points += 1; // bonus points
            }
            data1.set(batter, {
              runs: batter_run,
              points: batter_points,
              wicketCount: batter_wicketCount,
              catchCount: batter_catchCount,
            });
          }
        }

        if (matchJSONData[i].overs === over_no) {
          run_per_over += run_per_ball;
        } else {
          if (data1.get(bowler)) {
            let bowler_runs = data1.get(bowler).runs;
            let bowler_points = data1.get(bowler).points;
            let bowler_wicketCount = data1.get(bowler).wicketCount;
            let bowler_catchCount = data1.get(bowler).catchCount;
            if (run_per_over === 0) {
              bowler_points += 12;
            }
            data1.set(bowler, {
              runs: bowler_runs,
              points: bowler_points,
              wicketCount: bowler_wicketCount,
              catchCount: bowler_catchCount,
            });
          }
          over_no = matchJSONData[i].overs;
          run_per_over = run_per_ball;
        }

        flag = false;
      } else {
        if (flag === false) {
          if (data1.get(bowler_name)) {
            let bowler_runs = data1.get(bowler_name).runs;
            let bowler_points = data1.get(bowler_name).points;
            let bowler_wicketCount = data1.get(bowler_name).wicketCount;
            let bowler_catchCount = data1.get(bowler_name).catchCount;
            if (run_per_over === 0) {
              bowler_points += 12;
            }
            data1.set(bowler_name, {
              runs: bowler_runs,
              points: bowler_points,
              wicketCount: bowler_wicketCount,
              catchCount: bowler_catchCount,
            });
          }
          over_no = 0;
          run_per_over = 0;
          flag = true;
        }
        let run_per_ball = matchJSONData[i].total_run;
        let batter = matchJSONData[i].batter;
        let bowler = matchJSONData[i].bowler;
        bowler_name = bowler;
        let fielders_involved = matchJSONData[i].fielders_involved;
        if (matchJSONData[i].isWicketDelivery) {
          if (data1.get(batter)) {
            let batter_run = data1.get(batter).runs;
            let batter_points = data1.get(batter).points;
            let batter_wicketCount = data1.get(batter).wicketCount;
            let batter_catchCount = data1.get(batter).catchCount;
            if (batter_run === 0) {
              batter_points += -2;
            }
            data1.set(batter, {
              runs: batter_run,
              points: batter_points,
              wicketCount: batter_wicketCount,
              catchCount: batter_catchCount,
            });
          }

          let kind = matchJSONData[i].kind.toLowerCase();
          if (data1.get(bowler)) {
            let bowler_runs = data1.get(bowler).runs;
            let bowler_points = data1.get(bowler).points;
            let bowler_wicketCount = data1.get(bowler).wicketCount;
            let bowler_catchCount = data1.get(bowler).catchCount;
            if (kind === "lbw" || kind === "bowled") {
              bowler_points += 8; //bonus points
              bowler_points += 25;
              bowler_wicketCount += 1;
            }
            if (kind === "caught") {
              bowler_points += 25;
              bowler_wicketCount += 1;
            }
            data1.set(bowler, {
              runs: bowler_runs,
              points: bowler_points,
              wicketCount: bowler_wicketCount,
              catchCount: bowler_catchCount,
            });
          }

          if (data1.get(fielders_involved)) {
            let fielders_run = data1.get(fielders_involved).runs;
            let fielders_points = data1.get(fielders_involved).points;
            let fielders_wicketCount = data1.get(fielders_involved).wicketCount;
            let fielders_catchCount = data1.get(fielders_involved).catchCount;
            if (kind === "caught") {
              fielders_points += 8;
              fielders_catchCount += 1;
            }
            if (kind === "stumping") fielders_points += 12;
            if (kind === "run out") fielders_points += 6;
            data1.set(fielders_involved, {
              runs: fielders_run,
              points: fielders_points,
              wicketCount: fielders_wicketCount,
              catchCount: fielders_catchCount,
            });
          }
        } else {
          if (data1.get(batter)) {
            let batter_run_on_ball = matchJSONData[i].batsman_run;
            let batter_run = data1.get(batter).runs;
            let batter_points = data1.get(batter).points;
            let batter_wicketCount = data1.get(batter).wicketCount;
            let batter_catchCount = data1.get(batter).catchCount;
            if (batter_run_on_ball === 4) {
              batter_run += 4;
              batter_points += 1; // bonus points
            } else if (batter_run_on_ball === 6) {
              batter_run += 6;
              batter_points += 2; // bonus points
            } else if (batter_run_on_ball !== 0) {
              batter_run += batter_run_on_ball;
              batter_points += 1; // bonus points
            }
            data1.set(batter, {
              runs: batter_run,
              points: batter_points,
              wicketCount: batter_wicketCount,
              catchCount: batter_catchCount,
            });
          }
        }
        if (matchJSONData[i].overs === over_no) {
          run_per_over += run_per_ball;
        } else {
          if (data1.get(bowler_name)) {
            let bowler_runs = data1.get(bowler_name).runs;
            let bowler_points = data1.get(bowler_name).points;
            let bowler_wicketCount = data1.get(bowler_name).wicketCount;
            let bowler_catchCount = data1.get(bowler_name).catchCount;
            if (run_per_over === 0) {
              bowler_points += 12;
            }
            data1.set(bowler_name, {
              runs: bowler_runs,
              points: bowler_points,
              wicketCount: bowler_wicketCount,
              catchCount: bowler_catchCount,
            });
          }
          over_no = matchJSONData[i].overs;
          run_per_over = run_per_ball;
        }
      }
    }
    if (flag === true) {
      if (data1.get(bowler_name)) {
        let bowler_runs = data1.get(bowler_name).runs;
        let bowler_points = data1.get(bowler_name).points;
        let bowler_wicketCount = data1.get(bowler_name).wicketCount;
        let bowler_catchCount = data1.get(bowler_name).catchCount;
        if (run_per_over === 0) {
          bowler_points += 12;
        }
        data1.set(bowler_name, {
          runs: bowler_runs,
          points: bowler_points,
          wicketCount: bowler_wicketCount,
          catchCount: bowler_catchCount,
        });
      }
      over_no = 0;
      run_per_over = 0;
      flag = false;
    }
  }
  // bonus points for 100/50/30 ya wicket 3/4/5 ya catch 3/4/5
  for (const data1 of data) {
    data1.forEach((value, key) => {
      if (value.runs >= 100) {
        value.points += 16;
      } else if (value.runs >= 50 && value.runs < 100) {
        value.points += 8;
      } else if (value.runs >= 30 && value.runs < 50) {
        value.points += 4;
      }
      if (value.wicketCount >= 5) {
        value.points += 12;
      } else if (value.wicketCount === 4) {
        value.points += 8;
      } else if (value.wicketCount === 3) {
        value.points += 4;
      }
      if (value.catchCount >= 3) {
        value.points += 4;
      }
    });
  }

  // bonus points for captain and vice_captain
  for (let i = 0; i < cursorData.length; i++) {
    const captain = cursorData[i].captain;
    const vice_captain = cursorData[i].vice_captain;
    if (data[i].get(captain)) {
      const runs = data[i].get(captain).runs;
      const points = 2 * data[i].get(captain).points;
      const wicketCount = data[i].get(captain).wicketCount;
      const catchCount = data[i].get(captain).catchCount;
      data[i].set(captain, {
        runs: runs,
        points: points,
        wicketCount: wicketCount,
        catchCount: catchCount,
      });
    }
    if (data[i].get(vice_captain)) {
      const runs = data[i].get(vice_captain).runs;
      const points = 1.5 * data[i].get(vice_captain).points;
      const wicketCount = data[i].get(vice_captain).wicketCount;
      const catchCount = data[i].get(vice_captain).catchCount;
      data[i].set(vice_captain, {
        runs: runs,
        points: points,
        wicketCount: wicketCount,
        catchCount: catchCount,
      });
    }
  }

  for (let i = 0; i < cursorData.length; i++) {
    const objArray = [];
    let team_total_points = 0;
    for (const [key, value] of data[i]) {
      team_total_points += value.points;
      const obj = {
        [key]: value,
      };
      objArray.push(obj);
    }
    cursorData[i].players_points = objArray;
    cursorData[i].total_points = team_total_points;
  }
  cursorData.sort((a, b) => (a.total_points > b.total_points ? -1 : 1));
  res.status(200).json(cursorData);
});

app.get("/team-result", async (req, res) => {
  const cursor = await db.collection(DB_COLLECTION_NAME).find();
  const data = [];
  const cursorData = [];
  for await (const doc of cursor) {
    var mp = new Map();
    for await (const player of doc.players) {
      mp.set(player.name, {
        runs: 0,
        points: 0,
        wicketCount: 0,
        catchCount: 0,
      });
    }
    data.push(mp);
    cursorData.push(doc);
  }

  for (let data1 of data) {
    let run_per_over = 0;
    let over_no = 0;
    let bowler_name = "";
    let flag = true;
    for (var i = 0; i < matchJSONData.length; i++) {
      if (matchJSONData[i].innings === 1) {
        let run_per_ball = matchJSONData[i].total_run;
        let batter = matchJSONData[i].batter;
        let bowler = matchJSONData[i].bowler;
        bowler_name = bowler;
        let fielders_involved = matchJSONData[i].fielders_involved;
        if (matchJSONData[i].isWicketDelivery) {
          if (data1.get(batter)) {
            let batter_run = data1.get(batter).runs;
            let batter_points = data1.get(batter).points;
            let batter_wicketCount = data1.get(batter).wicketCount;
            let batter_catchCount = data1.get(batter).catchCount;
            if (batter_run === 0) {
              batter_points += -2;
            }
            data1.set(batter, {
              runs: batter_run,
              points: batter_points,
              wicketCount: batter_wicketCount,
              catchCount: batter_catchCount,
            });
          }

          let kind = matchJSONData[i].kind.toLowerCase();
          if (data1.get(bowler)) {
            let bowler_runs = data1.get(bowler).runs;
            let bowler_points = data1.get(bowler).points;
            let bowler_wicketCount = data1.get(bowler).wicketCount;
            let bowler_catchCount = data1.get(bowler).catchCount;
            if (kind === "lbw" || kind === "bowled") {
              bowler_points += 8; //bonus points
              bowler_points += 25;
              bowler_wicketCount += 1;
            }
            if (kind === "caught") {
              bowler_points += 25;
              bowler_wicketCount += 1;
            }
            data1.set(bowler, {
              runs: bowler_runs,
              points: bowler_points,
              wicketCount: bowler_wicketCount,
              catchCount: bowler_catchCount,
            });
          }

          if (data1.get(fielders_involved)) {
            let fielders_run = data1.get(fielders_involved).runs;
            let fielders_points = data1.get(fielders_involved).points;
            let fielders_wicketCount = data1.get(fielders_involved).wicketCount;
            let fielders_catchCount = data1.get(fielders_involved).catchCount;
            if (kind === "caught") {
              fielders_points += 8;
              fielders_catchCount += 1;
            }
            if (kind === "stumping") fielders_points += 12;
            if (kind === "run out") fielders_points += 6;
            data1.set(fielders_involved, {
              runs: fielders_run,
              points: fielders_points,
              wicketCount: fielders_wicketCount,
              catchCount: fielders_catchCount,
            });
          }
        } else {
          if (data1.get(batter)) {
            let batter_run_on_ball = matchJSONData[i].batsman_run;
            let batter_run = data1.get(batter).runs;
            let batter_points = data1.get(batter).points;
            let batter_wicketCount = data1.get(batter).wicketCount;
            let batter_catchCount = data1.get(batter).catchCount;
            if (batter_run_on_ball === 4) {
              batter_run += 4;
              batter_points += 1; // bonus points
            } else if (batter_run_on_ball === 6) {
              batter_run += 6;
              batter_points += 2; // bonus points
            } else if (batter_run_on_ball !== 0) {
              batter_run += batter_run_on_ball;
              batter_points += 1; // bonus points
            }
            data1.set(batter, {
              runs: batter_run,
              points: batter_points,
              wicketCount: batter_wicketCount,
              catchCount: batter_catchCount,
            });
          }
        }

        if (matchJSONData[i].overs === over_no) {
          run_per_over += run_per_ball;
        } else {
          if (data1.get(bowler)) {
            let bowler_runs = data1.get(bowler).runs;
            let bowler_points = data1.get(bowler).points;
            let bowler_wicketCount = data1.get(bowler).wicketCount;
            let bowler_catchCount = data1.get(bowler).catchCount;
            if (run_per_over === 0) {
              bowler_points += 12;
            }
            data1.set(bowler, {
              runs: bowler_runs,
              points: bowler_points,
              wicketCount: bowler_wicketCount,
              catchCount: bowler_catchCount,
            });
          }
          over_no = matchJSONData[i].overs;
          run_per_over = run_per_ball;
        }

        flag = false;
      } else {
        if (flag === false) {
          if (data1.get(bowler_name)) {
            let bowler_runs = data1.get(bowler_name).runs;
            let bowler_points = data1.get(bowler_name).points;
            let bowler_wicketCount = data1.get(bowler_name).wicketCount;
            let bowler_catchCount = data1.get(bowler_name).catchCount;
            if (run_per_over === 0) {
              bowler_points += 12;
            }
            data1.set(bowler_name, {
              runs: bowler_runs,
              points: bowler_points,
              wicketCount: bowler_wicketCount,
              catchCount: bowler_catchCount,
            });
          }
          over_no = 0;
          run_per_over = 0;
          flag = true;
        }
        let run_per_ball = matchJSONData[i].total_run;
        let batter = matchJSONData[i].batter;
        let bowler = matchJSONData[i].bowler;
        bowler_name = bowler;
        let fielders_involved = matchJSONData[i].fielders_involved;
        if (matchJSONData[i].isWicketDelivery) {
          if (data1.get(batter)) {
            let batter_run = data1.get(batter).runs;
            let batter_points = data1.get(batter).points;
            let batter_wicketCount = data1.get(batter).wicketCount;
            let batter_catchCount = data1.get(batter).catchCount;
            if (batter_run === 0) {
              batter_points += -2;
            }
            data1.set(batter, {
              runs: batter_run,
              points: batter_points,
              wicketCount: batter_wicketCount,
              catchCount: batter_catchCount,
            });
          }

          let kind = matchJSONData[i].kind.toLowerCase();
          if (data1.get(bowler)) {
            let bowler_runs = data1.get(bowler).runs;
            let bowler_points = data1.get(bowler).points;
            let bowler_wicketCount = data1.get(bowler).wicketCount;
            let bowler_catchCount = data1.get(bowler).catchCount;
            if (kind === "lbw" || kind === "bowled") {
              bowler_points += 8; //bonus points
              bowler_points += 25;
              bowler_wicketCount += 1;
            }
            if (kind === "caught") {
              bowler_points += 25;
              bowler_wicketCount += 1;
            }
            data1.set(bowler, {
              runs: bowler_runs,
              points: bowler_points,
              wicketCount: bowler_wicketCount,
              catchCount: bowler_catchCount,
            });
          }

          if (data1.get(fielders_involved)) {
            let fielders_run = data1.get(fielders_involved).runs;
            let fielders_points = data1.get(fielders_involved).points;
            let fielders_wicketCount = data1.get(fielders_involved).wicketCount;
            let fielders_catchCount = data1.get(fielders_involved).catchCount;
            if (kind === "caught") {
              fielders_points += 8;
              fielders_catchCount += 1;
            }
            if (kind === "stumping") fielders_points += 12;
            if (kind === "run out") fielders_points += 6;
            data1.set(fielders_involved, {
              runs: fielders_run,
              points: fielders_points,
              wicketCount: fielders_wicketCount,
              catchCount: fielders_catchCount,
            });
          }
        } else {
          if (data1.get(batter)) {
            let batter_run_on_ball = matchJSONData[i].batsman_run;
            let batter_run = data1.get(batter).runs;
            let batter_points = data1.get(batter).points;
            let batter_wicketCount = data1.get(batter).wicketCount;
            let batter_catchCount = data1.get(batter).catchCount;
            if (batter_run_on_ball === 4) {
              batter_run += 4;
              batter_points += 1; // bonus points
            } else if (batter_run_on_ball === 6) {
              batter_run += 6;
              batter_points += 2; // bonus points
            } else if (batter_run_on_ball !== 0) {
              batter_run += batter_run_on_ball;
              batter_points += 1; // bonus points
            }
            data1.set(batter, {
              runs: batter_run,
              points: batter_points,
              wicketCount: batter_wicketCount,
              catchCount: batter_catchCount,
            });
          }
        }
        if (matchJSONData[i].overs === over_no) {
          run_per_over += run_per_ball;
        } else {
          if (data1.get(bowler_name)) {
            let bowler_runs = data1.get(bowler_name).runs;
            let bowler_points = data1.get(bowler_name).points;
            let bowler_wicketCount = data1.get(bowler_name).wicketCount;
            let bowler_catchCount = data1.get(bowler_name).catchCount;
            if (run_per_over === 0) {
              bowler_points += 12;
            }
            data1.set(bowler_name, {
              runs: bowler_runs,
              points: bowler_points,
              wicketCount: bowler_wicketCount,
              catchCount: bowler_catchCount,
            });
          }
          over_no = matchJSONData[i].overs;
          run_per_over = run_per_ball;
        }
      }
    }
    if (flag === true) {
      if (data1.get(bowler_name)) {
        let bowler_runs = data1.get(bowler_name).runs;
        let bowler_points = data1.get(bowler_name).points;
        let bowler_wicketCount = data1.get(bowler_name).wicketCount;
        let bowler_catchCount = data1.get(bowler_name).catchCount;
        if (run_per_over === 0) {
          bowler_points += 12;
        }
        data1.set(bowler_name, {
          runs: bowler_runs,
          points: bowler_points,
          wicketCount: bowler_wicketCount,
          catchCount: bowler_catchCount,
        });
      }
      over_no = 0;
      run_per_over = 0;
      flag = false;
    }
  }
  // bonus points for 100/50/30 ya wicket 3/4/5 ya catch 3/4/5
  for (const data1 of data) {
    data1.forEach((value, key) => {
      if (value.runs >= 100) {
        value.points += 16;
      } else if (value.runs >= 50 && value.runs < 100) {
        value.points += 8;
      } else if (value.runs >= 30 && value.runs < 50) {
        value.points += 4;
      }
      if (value.wicketCount >= 5) {
        value.points += 12;
      } else if (value.wicketCount === 4) {
        value.points += 8;
      } else if (value.wicketCount === 3) {
        value.points += 4;
      }
      if (value.catchCount >= 3) {
        value.points += 4;
      }
    });
  }

  // bonus points for captain and vice_captain
  for (let i = 0; i < cursorData.length; i++) {
    const captain = cursorData[i].captain;
    const vice_captain = cursorData[i].vice_captain;
    if (data[i].get(captain)) {
      const runs = data[i].get(captain).runs;
      const points = 2 * data[i].get(captain).points;
      const wicketCount = data[i].get(captain).wicketCount;
      const catchCount = data[i].get(captain).catchCount;
      data[i].set(captain, {
        runs: runs,
        points: points,
        wicketCount: wicketCount,
        catchCount: catchCount,
      });
    }
    if (data[i].get(vice_captain)) {
      const runs = data[i].get(vice_captain).runs;
      const points = 1.5 * data[i].get(vice_captain).points;
      const wicketCount = data[i].get(vice_captain).wicketCount;
      const catchCount = data[i].get(vice_captain).catchCount;
      data[i].set(vice_captain, {
        runs: runs,
        points: points,
        wicketCount: wicketCount,
        catchCount: catchCount,
      });
    }
  }

  for (let i = 0; i < cursorData.length; i++) {
    const objArray = [];
    let team_total_points = 0;
    for (const [key, value] of data[i]) {
      team_total_points += value.points;
      const obj = {
        [key]: value,
      };
      objArray.push(obj);
    }
    cursorData[i].players_points = objArray;
    cursorData[i].total_points = team_total_points;
  }
  cursorData.sort((a, b) => (a.total_points > b.total_points ? -1 : 1));
  const teamResult = cursorData[0];
  res.status(200).json(teamResult);
});

app.post("/add-team", async (req, res) => {
  const postData = req.body;
  if (!postData[0].team_name) {
    res.send("must include team name");
    return;
  } else if (!postData[0].captain) {
    res.send("must include captain name");
    return;
  } else if (!postData[0].vice_captain) {
    res.send("must include vice captain name");
    return;
  }
  let bat = 0;
  let blr = 0;
  let wk = 0;
  let ar = 0;
  const mp = new Map();
  const element = postData[0].players;
  if (element.length !== 11) {
    res.send("team must have 11 players");
  }
  for (let j = 0; j < element.length; j++) {
    if (element[j].role === "Batter") {
      bat = 1;
    } else if (element[j].role === "Bowler") {
      blr = 1;
    } else if (element[j].role === "Wicket Keeper") {
      wk = 1;
    } else if (element[j].role === "All Rounder") {
      ar = 1;
    }
    if (mp.get(element[j].team)) {
      mp.set(element[j].team, mp.get(element[j].team) + 1);
    } else {
      mp.set(element[j].team, 1);
    }
  }

  if (bat === 0) {
    res.send("Add minimum 1 Batter in your team");
  } else if (blr === 0) {
    res.send("Add minimum 1 Bowler in your team");
  } else if (wk === 0) {
    res.send("Add minimum 1 Wicket Keeper in your team");
  } else if (ar === 0) {
    res.send("Add minimum 1 All Rounder in your team");
  }
  if (mp.size !== 2) {
    res.send(
      "Add minimum 1 player from one team and maximum 10 player from another team"
    );
  }
  const result = await db.collection(DB_COLLECTION_NAME).insertMany(req.body);
  if (result.insertedCount) {
    res.send("team added successfully");
  } else {
    res.json({ massage: "failed", data: result });
  }
});

var PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log("server is running on " + PORT);
});
