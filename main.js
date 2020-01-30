//Client設定
const Client_Name = "<ClientName>"; //複数クライアントの環境で重複させない
const interval = 1; //単位は秒[s]
const ServerIP = "<ServerIP>";
const ServerPATH = "/";

//非同期でexecを読み込み
const exec = require("child_process").exec;
//httpsモジュール
const https = require("https")
//filesystem読み込み
const fs = require("fs");

let setup = false;
//CPU
var CPU_IOWait_now = fs
  .readFileSync("/proc/stat")
  .toString()
  .split(/\r\n|\r|\n/)[0]
  .split(/\s/)[6];
var CPU_IOWait_prev = fs
  .readFileSync("/proc/stat")
  .toString()
  .split(/\r\n|\r|\n/)[0]
  .split(/\s/)[6];
var CPU_IOWait;
//Network
var Network = [];
var Network_RX_now = [];
var Network_RX_prev = [];
var Network_TX_now = [];
var Network_TX_prev = [];
var Network_RX = [];
var Network_TX = [];
var Network_name = [];
var NetworkIO = [];
//Disk
var Disk = [];
var Disk_IORead_now = [];
var Disk_IOWrite_now = [];
var Disk_IORead_prev = [];
var Disk_IOWrite_prev = [];
var Disk_IORead = [];
var Disk_IOWrite = [];
var Disk_name = [];
var DiskIO = [];
//RAM
var RAM = [];
var RAMstatus = {};
//DiskFree
var df = [];
var dfname = [];
var dftotal = [];
var dffree = [];
var DiskFree = [];

//ヘッダーを定義
const headers = {
  "Content-Type": "application/json"
};
//POSTData
var POSTData={}
var POSTDataStr=""

//起動時のみ実行する
function setupfunc() {
  //Network
  //ヘッダ分(2)だけ調整している
  Network = fs
    .readFileSync("/proc/net/dev")
    .toString()
    .split(/\r\n|\r|\n/)
    .filter(function(e) {
      return e !== "";
    });
  for (var i = 0; i < Network.length - 2; i++) {
    //空文字をfillterで消去
    Network_name[i] = Network[2 + i].split(/\s/).filter(function(e) {
      return e !== "";
    })[0];
    Network_RX_now[i] =
      Network[2 + i].split(/\s/).filter(function(e) {
        return e !== "";
      })[1] / 1000;
    Network_TX_now[i] =
      Network[2 + i].split(/\s/).filter(function(e) {
        return e !== "";
      })[9] / 1000;
    Network_RX_prev[i] = Network_RX_now[i];
    Network_TX_prev[i] = Network_TX_now[i];
    Network_RX[i] = (Network_RX_now[i] - Network_RX_prev[i]) / interval;
    Network_TX[i] = (Network_TX_now[i] - Network_TX_prev[i]) / interval;
  }

  //Disk
  Disk = fs
    .readFileSync("/proc/diskstats")
    .toString()
    .split(/\r\n|\r|\n/)
    .filter(function(e) {
      return e !== "";
    });
  for (var i = 0; i < Disk.length; i++) {
    //空文字を消去
    Disk_name[i] = Disk[i].split(/\s/).filter(function(e) {
      return e !== "";
    })[2];
    Disk_IORead_now[i] = Disk[i].split(/\s/).filter(function(e) {
      return e !== "";
    })[3];
    Disk_IOWrite_now[i] = Disk[i].split(/\s/).filter(function(e) {
      return e !== "";
    })[7];
    Disk_IORead_prev[i] = Disk_IORead_now[i];
    Disk_IOWrite_prev[i] = Disk_IOWrite_now[i];
    Disk_IORead[i] = (Disk_IORead_now[i] - Disk_IORead_prev[i]) / interval;
    Disk_IOWrite[i] = (Disk_IOWrite_now[i] - Disk_IOWrite_prev[i]) / interval;
  }

  //RAM
  RAM = fs
    .readFileSync("/proc/meminfo")
    .toString()
    .split(/\r\n|\r|\n/).filter(function(e) {
        return e !== "";
      });;

  for (var i = 0; i < RAM.length; i++) {
    switch (
      RAM[i].split(/\s/).filter(function(e) {
        return e !== "";
      })[0]
    ) {
      case "MemTotal:":
        RAMstatus.MenTotal = Math.round(
          RAM[i].split(/\s/).filter(function(e) {
            return e !== "";
          })[1] / 1000
        );
        break;

      case "MemFree:":
        RAMstatus.MenFree = Math.round(
          RAM[i].split(/\s/).filter(function(e) {
            return e !== "";
          })[1] / 1000
        );
        break;

      case "Buffers:":
        RAMstatus.Buffers = Math.round(
          RAM[i].split(/\s/).filter(function(e) {
            return e !== "";
          })[1] / 1000
        );
        break;

      case "Cached:":
        RAMstatus.Cached = Math.round(
          RAM[i].split(/\s/).filter(function(e) {
            return e !== "";
          })[1] / 1000
        );
        break;

      case "SwapTotal:":
        RAMstatus.SwapTotal = Math.round(
          RAM[i].split(/\s/).filter(function(e) {
            return e !== "";
          })[1] / 1000
        );
        break;

      case "SwapFree:":
        RAMstatus.SwapFree = Math.round(
          RAM[i].split(/\s/).filter(function(e) {
            return e !== "";
          })[1] / 1000
        );
        break;
    }
  }

  //DiskFree
  exec("df -m", (err, stdout, stderr) => {
    if (err | stderr) {
      console.log("err");
    } else {
      df = stdout.split(/\r\n|\r|\n/).filter(function(e) {
        return e !== "";
      });;
      for (var i = 0; i < df.length - 1; i++) {
        dfname[i] = df[i + 1].split(/\s/).filter(function(e) {
          return e !== "";
        })[0];

        dftotal[i] = df[i + 1].split(/\s/).filter(function(e) {
          return e !== "";
        })[1];

        dffree[i] = df[i + 1].split(/\s/).filter(function(e) {
          return e !== "";
        })[3];
        DiskFree.push({
          Name: dfname[i],
          DiskTotal: dftotal[i],
          DiskFree: dffree[i]
        });
      }
    }
  });

  console.log("Setup Complete");
}

//ファイルの更新

function syncfile() {
  //CPU IOWait
  fs.readFile("/proc/stat", "utf8", function(err, data) {
    if (err) {
      console.log(err);
    } else {
      CPU_IOWait_prev = CPU_IOWait_now;
      CPU_IOWait_now = data
        .toString()
        .split(/\r\n|\r|\n/)[0]
        .split(/\s/)[6];
      CPU_IOWait = CPU_IOWait_now - CPU_IOWait_prev;
    }
  });
  //Network
  fs.readFile("/proc/net/dev", "utf8", function(err, data) {
    if (err) {
      console.log(err);
    } else {
      NetworkIO = [];
      Network = data
        .toString()
        .split(/\r\n|\r|\n/)
        .filter(function(e) {
          return e !== "";
        });
      for (var i = 0; i < Network.length - 2; i++) {
        //空文字をfillterで消去
        Network_name[i] = Network[2 + i].split(/\s/).filter(function(e) {
          return e !== "";
        })[0];
        Network_RX_prev[i] = Network_RX_now[i];
        Network_TX_prev[i] = Network_TX_now[i];
        Network_RX_now[i] =
          Network[2 + i].split(/\s/).filter(function(e) {
            return e !== "";
          })[1] / 1000;
        Network_TX_now[i] =
          Network[2 + i].split(/\s/).filter(function(e) {
            return e !== "";
          })[9] / 1000;
        Network_RX[i] = (Network_RX_now[i] - Network_RX_prev[i]) / interval;
        Network_TX[i] = (Network_TX_now[i] - Network_TX_prev[i]) / interval;
        NetworkIO.push({
          Name: Network_name[i],
          RX: Number.parseFloat(Network_RX[i]).toFixed(4),
          TX: Number.parseFloat(Network_TX[i]).toFixed(4)
        });
      }
    }
  });

  //Disk I/O
  fs.readFile("/proc/diskstats", "utf8", function(err, data) {
    if (err) {
      console.log(err);
    } else {
      DiskIO = [];
      Disk = data
        .toString()
        .split(/\r\n|\r|\n/)
        .filter(function(e) {
          return e !== "";
        });
      for (var i = 0; i < Disk.length; i++) {
        //空文字を消去
        Disk_name[i] = Disk[i].split(/\s/).filter(function(e) {
          return e !== "";
        })[2];
        Disk_IORead_prev[i] = Disk_IORead_now[i];
        Disk_IOWrite_prev[i] = Disk_IOWrite_now[i];
        Disk_IORead_now[i] = Disk[i].split(/\s/).filter(function(e) {
          return e !== "";
        })[3];
        Disk_IOWrite_now[i] = Disk[i].split(/\s/).filter(function(e) {
          return e !== "";
        })[7];
        Disk_IORead[i] = (Disk_IORead_now[i] - Disk_IORead_prev[i]) / interval;
        Disk_IOWrite[i] =
          (Disk_IOWrite_now[i] - Disk_IOWrite_prev[i]) / interval;
        DiskIO.push({
          Name: Disk_name[i],
          IOReadPS: Number.parseFloat(Disk_IORead[i]).toFixed(4),
          IOWritePS: Number.parseFloat(Disk_IOWrite[i]).toFixed(4)
        });
      }
    }
  });

  //RAM
  fs.readFile("/proc/meminfo", "utf8", function(err, data) {
    if (err) {
      console.log(err);
    } else {
      RAMstatus = {};
      RAM = data.toString().split(/\r\n|\r|\n/).filter(function(e) {
        return e !== "";
      });;
      for (var i = 0; i < RAM.length; i++) {
        switch (
          RAM[i].split(/\s/).filter(function(e) {
            return e !== "";
          })[0]
        ) {
          case "MemTotal:":
            RAMstatus.MenTotal = Math.round(
              RAM[i].split(/\s/).filter(function(e) {
                return e !== "";
              })[1] / 1000
            );
            break;

          case "MemFree:":
            RAMstatus.MenFree = Math.round(
              RAM[i].split(/\s/).filter(function(e) {
                return e !== "";
              })[1] / 1000
            );
            break;

          case "Buffers:":
            RAMstatus.Buffers = Math.round(
              RAM[i].split(/\s/).filter(function(e) {
                return e !== "";
              })[1] / 1000
            );
            break;

          case "Cached:":
            RAMstatus.Cached = Math.round(
              RAM[i].split(/\s/).filter(function(e) {
                return e !== "";
              })[1] / 1000
            );
            break;

          case "SwapTotal:":
            RAMstatus.SwapTotal = Math.round(
              RAM[i].split(/\s/).filter(function(e) {
                return e !== "";
              })[1] / 1000
            );
            break;

          case "SwapFree:":
            RAMstatus.SwapFree = Math.round(
              RAM[i].split(/\s/).filter(function(e) {
                return e !== "";
              })[1] / 1000
            );
            break;
        }
      }
    }
  });

  exec("df -m", (err, stdout, stderr) => {
    if (err | stderr) {
      console.log("err");
    } else {
      DiskFree = [];
      df = stdout.split(/\r\n|\r|\n/).filter(function(e) {
        return e !== "";
      });;
      for (var i = 0; i < df.length - 1; i++) {
        dfname[i] = df[i + 1].split(/\s/).filter(function(e) {
          return e !== "";
        })[0];

        dftotal[i] = df[i + 1].split(/\s/).filter(function(e) {
          return e !== "";
        })[1];

        dffree[i] = df[i + 1].split(/\s/).filter(function(e) {
          return e !== "";
        })[3];
        DiskFree.push({
          Name: dfname[i],
          DiskTotal: dftotal[i],
          DiskFree: dffree[i]
        });
      }
    }
  });
}

//httpsでPOSTする関数
function httpspost(){
  POSTDataStr = JSON.stringify(POSTData);
  console.log(POSTDataStr)
  let options = {
    host: ServerIP,
    port: 443,
    path: ServerPATH,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(POSTDataStr)
    }
};
let req = https.request(options, (res) => {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log('BODY: ' + chunk);
  });
});
req.on('error', (e) => {
  console.log('problem with request: ' + e.message);
});
req.write(POSTDataStr);
req.end();
}

//定期実行する関数の定義
function CheckStatus() {
  if (setup === false) {
    setupfunc();
    syncfile();
    setup = true;
  } else {
    syncfile();

    //postData
     POSTData = {
        Name: Client_Name,
        CPU_IOWait: Number.parseFloat(CPU_IOWait).toFixed(4),
        NetworkIO: NetworkIO,
        DiskIO: DiskIO,
        RAM: RAMstatus,
        DiskFree: DiskFree
    };
    httpspost();
  }
}