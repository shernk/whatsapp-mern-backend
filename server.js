import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessage.js";
import Pusher from "pusher";
import cors from "cors";

// app config
const app = express();

const pusher = new Pusher({
  appId: "1101620",
  key: "061b84e266327d24d8e1",
  secret: "a3c000d4a72f7515e04e",
  cluster: "ap1",
  useTLS: true,
});

// middle ware
app.use(express.json());
app.use(cors());

// DB config
const connection_url =
  "mongodb+srv://whatsapp:mern@cluster0.zsfdy.mongodb.net/whatsapp?retryWrites=true&w=majority";

mongoose.connect(connection_url, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.once("open", () => {
  //check data from database
  const msgCollection = db.collection("messagecontents");
  const changeStream = msgCollection.watch();

  changeStream.on("change", (change) => {
    /* Example when we send a message: 
    A change occured {
      _id: {
        _data: '82621D89CC000000012B022C0100296E5A100453FCDBB74A0248919AF8E937E97AE81846645F69640064621D89A6C5D4DE028C7366530004'
      },
      * operationType: 'insert',
      clusterTime: Timestamp { _bsontype: 'Timestamp', low_: 1, high_: 1646102988 },
      * fullDocument: {
        _id: 621d89a6c5d4de028c736653,
        message: 'see ya',
        name: 'SherkName',
        timestamp: 'Live',
        received: true,
        __v: 0
      },
  */
    console.log("A change occured", change);

    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        message: messageDetails.message,
        name: messageDetails.name,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log("Error triggering Pusher");
    }
  });
});

// api route
app.get("/", (req, res) => res.status(200).send("hello world"));

app.get("/messages/sync", (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.post("/messages/new", (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

// listen
const port = process.env.PORT || 9000;
app.listen(port, () => console.log(`Listening on localhost:${port}`));
