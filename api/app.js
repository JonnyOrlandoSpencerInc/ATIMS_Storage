const express = require('express');
const multer = require('multer');
const { diskStorage, MulterError } = require('multer');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
// there is no .env file but this would allow one to be used.
const PORT = process.env.PORT || 3500;

// Use cors middleware to enable CORS support
app.use(cors());

// Use multer middleware for handling file uploads
const storage = diskStorage({
  destination: async (req, file, cb) => {
    const path = `./files/${req.params.id}`;

    try {
      const folders = await fs.readdir("./files");
      if (folders.includes(req.params.id)) {
        cb(null, path);
      } else {
        fs.mkdir(path, { recursive: true });
        cb(null, path);
      }
    } catch (error) {
      console.log(error);
    }
  },
  filename: (req, file, cb) => {
    const fileType = req.params.fileType || "noFileType";
    console.log("new file type is: ",req.params)
    let newName;
    if (file.originalname.includes("-")) {
      newName = file.originalname.split("-").join("~").split(".")[0];
    } else {
      newName = file.originalname.split(".")[0];
      console.log(newName)
    }

    const ext = file.mimetype.split("/")[1];
    const newFileName = `${newName}-${fileType}-${Date.now()}.${ext}`;
    cb(null, newFileName);
  },
});

const uploadFiles = multer({
  // the fuction that is default called in the post request.
  storage: storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // max size 1 mb
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "application/pdf" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "application/msword" ||
      file.mimetype == "image/png"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      const err = new Error(
        "Only .png, .pdf, .docx, .jpg, and .jpeg format allowed"
      );
      err.name = "ExtensionError";
      return cb(err);
    }
  },
}).single("file");

// Use express.urlencoded middleware for parsing form data
app.use(express.urlencoded({ extended: true }));

app.post("/upload/:id/:fileType", uploadFiles, (req, res) => {
  // For creating a new file
  // The uploaded files are available in req.files array
  // Access newFileName from the first file in the array
  console.log(req.file)
  const newFileName = req.file.filename;

  if (newFileName) {
    console.log("new file");
    res.status(200).json({ success: true, fileName: newFileName });
  } else {
    console.log("failed");
    res.status(500).json({ success: false, error: "File upload failed" });
  }
});

app.get("/files/:id/:filename", async (req, res) => {
  // get a specific file
  const { id, filename } = req.params;
  const path = `./files/${id}/${filename}`;
  const files = await fs.readdir(`./files/${id}`);
  
  if (!files.includes(filename)) {
    res.status(500).json({ success: false, error: "Unable to retrieve file" });
  } else {
    console.log('file download success')
    res.status(200).download(path, filename);
  }
});

app.get("/files/:id", async (req, res) => {
  // get all files for a user id
  const id = req.params.id;

  try {
    const files = await fs.readdir(`./files/${id}`);

    const returnFiles = [];
    files.forEach((file) => {
      const time = file.split("-")[2].split(".")[0]
      const numberTime = parseInt(time)
      const date = new Date(numberTime)
      
      returnFiles.push({
        name: `${file.split("-")[0]}.${file.split("-")[2].split(".")[1]}`,
        fullName: file,
        type: `${file.split("-")[2].split(".")[1]}`,
        category: file.split("-")[1],
        id: id,
        createdAt: `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()} at ${date.getHours()}:${date.getMinutes()}`,
      });
    });
    
    res.status(200).json(returnFiles);
  } catch (error) {
    res.status(500).json({ success: false, error: "Unable to retrieve files" });
  }
});

const uploadUnlink = async (path) => {
  // function called in the delete end point
  try {
    fs.unlink(path);
    console.log("success");
  } catch (error) {
    console.log(`there was an error: ${error.message}`);
  }
};

app.delete("/delete/:id/:filename", (req, res) => {
  // for deleting a specific file if the name matches
  const { id, filename} = req.params;
  const pathFilename = `./files/${id}/${filename}`;
  uploadUnlink(pathFilename);
  res.status(200).end("success");
});

app.listen(PORT, () => console.log(`app is listening on port ${PORT}`));
