const express = require('express');
const bodyParser = require('body-parser');
var secrets = require('./secrets.json');
const spicedPg = require('spiced-pg');
const db = spicedPg(secrets.db);
var multer = require('multer');
var uidSafe = require('uid-safe');
var path = require('path');
const fs = require('fs');
const knox = require('knox');
const app = express();
var session = require('express-session');
var Store = require('connect-redis')(session);

app.use(session({
    store: new Store({
        ttl: 3600,
        host: 'localhost',
        port: 6379
    }),
    resave: false,
    saveUninitialized: true,
    secret: secrets.secret
}));

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(express.static(__dirname + '/public'));

const client = knox.createClient({
    key: secrets.AWS_KEY,
    secret: secrets.AWS_SECRET,
    bucket: 'spicedling'
});

var diskStorage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, __dirname + '/uploads');
    },
    filename: function (req, file, callback) {
      uidSafe(24).then(function(uid) {
          callback(null, uid + path.extname(file.originalname));
      });
    }
});

var uploader = multer({
    storage: diskStorage,
    limits: {
        filesize: 2097152
    }
});

app.get('/images', function(req, res){
	getImagesDb().then(function(results){
		res.json({
			images: mkUrl(results)
		});
	});
});

app.get('/images/more/:id', function(req, res){
    getMoreImagesDb(req.params.id).then(function(results){
        res.json({
            images: mkUrl(results)
        })
    })
})

app.post('/upload', uploader.single('file'), setToAWS, function(req, res) {
    if (req.file) {
    	var arr = [
    		req.file.filename,
    		req.body.username,
    		req.body.title,
    		req.body.description
    	];
    	setImageDb(arr).then(function(){
    		res.json({
	            success: true
	        });
    	}).catch(function(err){
    		console.log('UPLOAD', err.stack);
    	})
    } else {
        res.json({
            success: false
        });
    }
});

app.get('/image/:id', function(req, res){
    getSingleImage(req.params.id).then(function(image){
        res.json({
            images: mkUrl(image)
        });
    }).catch(function(err){
        console.log('/IMAGE/:id', err.stack);
    });
});

app.get('/checklike/:id', function(req, res){
    if(req.session[req.params.id]){
        res.json({
            like: true
        })
    }
    if(!req.session[req.params.id]){
       req.session[req.params.id] = true;
       res.json({
            like: false
        })
    }
});

app.post('/addlike/:id', function(req, res){
    setLike(req.params.id).then(function(){
        req.session[req.params.id] = true;
        res.json({
            success: true
        })
    }).catch(function(err){
        console.log('/ADDLIKE', err.stack);
    })
})

app.post('/removelike/:id', function(req, res){
    removeLike(req.params.id).then(function(){
        req.session[req.params.id] = false;
        res.json({
            success: true
        })
    }).catch(function(err){
        console.log('/REMOVELIKE', err.stack);
    })
})

app.get('/comments/:id', function(req, res){
    getComments(req.params.id).then(function(comments){
        res.json({
            comments: comments
        })
    }).catch(function(err){
        console.log(err.stack);
    });
});

app.post('/addcomment', function(req, res){
    var arr = [
        req.body.image_id,
        req.body.username,
        req.body.comment
    ];
    setComment(arr).then(function(newComment){
        res.json({
            username: arr[1],
            comment: arr[2]
        })
    }).catch(function(err){
        console.log('POST addcomment', err.stack);
    })
})

app.listen(8080, () => console.log(`I'm listening.`));


function getImagesDb(){
	return db.query('SELECT * FROM images ORDER BY id DESC LIMIT 6;').then(function(images){
		return images.rows;
	})
}

function getMoreImagesDb(id){
    return db.query('SELECT * FROM images WHERE id < $1 ORDER BY id DESC LIMIT 6;', [id]).then(function(images){
        return images.rows;
    })
}

function setImageDb(arr){
	return db.query('INSERT INTO images (image, username, title, description, likes) VALUES ($1, $2, $3, $4, 0)', arr);
}

function setLike(id){
    return db.query('UPDATE images SET likes = likes + 1 WHERE id = $1', [id]);
}

function removeLike(id){
    return db.query('UPDATE images SET likes = likes - 1 WHERE id = $1', [id]);
}

function getSingleImage(id){
    return db.query('SELECT * FROM images WHERE id = $1', [id]).then(function(image){
        return image.rows;
    })
}

function getComments(id){
    return db.query('SELECT * FROM comments WHERE image_id = $1 ORDER BY id DESC', [id]).then(function(comments){
        return comments.rows;
    })
}

function setComment(arr){
    return db.query('INSERT INTO comments (image_id, username_comment, comment) VALUES ($1, $2, $3)', arr)
}

function mkUrl(data){
	return data.map(function(row){
		row.image = secrets.s3Url + row.image;
		return row;
	})
}

function setToAWS(req, res, next){
	const s3Request = client.put(req.file.filename, {
	    'Content-Type': req.file.mimetype,
	    'Content-Length': req.file.size,
	    'x-amz-acl': 'public-read'
	});
	const readStream = fs.createReadStream(req.file.path);
	readStream.pipe(s3Request);

	s3Request.on('response', s3Response => {
	    const wasSuccessful = s3Response.statusCode == 200;
	    if(wasSuccessful){
	    	next();
	    }
	});
}

