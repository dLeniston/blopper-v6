var express           = require("express"),
Blog                  = require("./models/blog"),
User                  = require("./models/user"),
Profile               = require("./models/profile"),
flash                 = require("connect-flash"),
passport              = require("passport"),
bodyParser            = require("body-parser"),
mongoose              = require("mongoose"),
localStrategy         = require("passport-local"),
methodOverride        = require("method-override"),
expressSanitizer      = require("express-sanitizer"),
passportLocalMongoose = require("passport-local-mongoose");

var app = express();

mongoose.connect("mongodb://darren:cSas831SdcAa@ds157185.mlab.com:57185/blopper_v6");
//mongoose.connect("mongodb://localhost/project_blog_app_V4");


app.use(require("express-session")({
    secret: "X92 GGAAKS DJSDAA",
    resave: false,
    saveUninitialized: false
}));

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(flash());
app.use(bodyParser.urlencoded({extended: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));
app.use(expressSanitizer());

passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

//====================================//
//              ROUTES                //
//====================================//

app.get("/", function(req, res){
    res.redirect("/blogs");
});

//INDEX ROUTE
app.get("/blogs", function(req, res){
    Blog.find({}).sort({created: 1}).exec(function(err, allBlogs){
        if(err){
            console.log("Error");
        }else{
            res.render("blogs/index", {blogs: allBlogs});
        }
    });
});

//========================//
//      BLOG ROUTES       //
//========================//

//NEW ROUTE
app.get("/blogs/new", isLoggedIn, function(req, res){
    res.render("blogs/new");
});

//CREATE ROUTE
app.post("/blogs", isLoggedIn, function(req, res){
    //create blog
    var title = req.body.blog.title;
    var image = req.body.blog.image;
    var body = req.body.body = req.sanitize(req.body.blog.body);
    var created = req.body.created;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
    var newBlog = {title: title, image: image, body: body, created: created, author: author};
    Blog.create(newBlog, function(err, newlyCreated){
        if(err){
            res.render("blogs/new");
        }else{
            //redirect to index
            req.flash("success", "Blog Post Created");
            res.redirect("/blogs");
        }
    });
});

//SHOW ROUTE
/*app.get("/blogs/:id", function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err){
            res.redirect("/blogs");
        }else{
            res.render("blogs/show", {blog: foundBlog});
        }
    });
});*/

app.get("/blogs/:id", function(req, res){
    Blog.findById(req.params.id, function (err, foundBlog){
        Profile.findOne({'owner.username': foundBlog.author.username}, function(err, foundProfile){
       User.findOne({'username' : foundBlog.author.username}, function(err, foundUser){
            res.render("blogs/show", {
               blog: foundBlog,
               profile: foundProfile,
               user: foundUser
            });
        });
    });
 });
});

//EDIT ROUTE
app.get("/blogs/:id/edit", checkBlogOwnership, function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err){
            res.redirect("/blogs");
        }else{
            res.render("blogs/edit", {blog: foundBlog});
        }
    });
});

//UPDATE ROUTE
app.put("/blogs/:id", checkBlogOwnership, function(req, res){
    Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedBlog){
        if(err){
            res.redirect("/blogs");
        }else{
            req.flash("success", "Blog Post Updated");
            res.redirect("/blogs/" + req.params.id);
        }
    });
});

//DELETE ROUTE
app.delete("/blogs/:id", checkBlogOwnership, function(req, res){
    //destroy blog
    Blog.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/blogs");
        }else{
            req.flash("error", "Blog Post Deleted");
            res.redirect("/blogs");
        }
    });
});

//========================//
//   USER PROFILE ROUTES  //
//========================//

app.get("/user/:id", function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        Profile.findOne({'owner.id' : foundUser.id}, function(err, foundProfile){
        Blog.find({'author.username' : foundProfile.owner.username}).sort({created: 1}).exec(function(err, foundBlogs){
            res.render("user/show", {
                user: foundUser,
                profile: foundProfile,
                blogs: foundBlogs
            });
        });
    });
  });
});

//EDIT ROUTE
app.get("/profile/:id/edit", checkProfileOwnership, function(req, res){
    Profile.findById(req.params.id, function(err, foundProfile){
        if(err){
            res.redirect("/blogs");
        }else{
            res.render("profile/edit", {profile: foundProfile});
        }
    });
});

/*app.get("/user/:id/edit", checkProfileOwnership, function(req, res){
    User.findById(req.params.id, function(err, foundUser){
    Profile.findOne({'owner.id': foundUser.id}, function(err, foundProfile){
            res.render("user/edit", {
                user: foundUser,
                profile: foundProfile
                
            });
        });
    });
});*/

//UPDATE ROUTE
app.put("/profile/:id", checkProfileOwnership, function(req, res){
    Profile.findByIdAndUpdate(req.params.id, req.body.profile, function(err, updatedProfile){
        if(err){
            res.redirect("/blogs");
        }else{
            req.flash("success", "User Profile Updated");
            res.redirect("/user/" + updatedProfile.owner.id);
        }
    });
});


//========================//
//     REGISTER ROUTES    //
//========================//

app.get("/register", function(req, res){
    res.render("register");
});

app.post("/register", function(req, res){
    User.register(new User({username: req.body.username}), req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register");
        }  
            passport.authenticate("local")(req, res, function(){
            var image = "http://jennstrends.com/wp-content/uploads/2013/10/bad-profile-pic-2.jpeg"
            var desc = "No User Description";
            var owner = {
            id: req.user._id,
            username: req.body.username
             };
            var newProfile = {image: image, desc: desc, owner: owner};
            Profile.create(newProfile);
            res.redirect("/blogs");
        });
    });
});

app.get("/register", function(req, res){
    res.render("register");
});

//Register Logic
app.post("/register", function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            return res.render("register", {"error": err.message});
        }
        passport.authenticate("local")(req,res,function(){
            req.flash("success", "Welcome to the Blog " + user.username);
            res.redirect("/blogs");
        });
    });
});

//========================//
//      LOGIN ROUTES      //
//========================//
app.get("/login", function(req, res){
    res.render("login");
});

//login middleware
app.post("/login", passport.authenticate("local", {
    successRedirect: "/blogs",
    failureRedirect: "/login"
}), function(req, res){
});

//logout
app.get("/logout", function(req, res){
    req.logout();
    req.flash("success", "Logged Out");
    res.redirect("/blogs");
});

//========================//
//      MIDDLEWARE        //
//========================//

function checkBlogOwnership(req, res, next){
    if(req.isAuthenticated()){
        Blog.findById(req.params.id, function(err, foundBlog){
            if(err){
                req.flash("error", "Blog not Found");
                res.redirect("/");
            }else{
                //does user own the blog post
                if(foundBlog.author.id.equals(req.user._id)){
                    next();
                }else{
                    req.flash("error", "Permission Denied");
                    res.redirect("/blogs");
                }
            }
        });
    }else{
        req.flash("error", "You need to be Logged In to do that");
        res.redirect("/blogs");
    }
}

function checkProfileOwnership(req, res, next){
    if(req.isAuthenticated()){
        Profile.findById(req.params.id, function(err, foundProfile){
            if(err){
                req.flash("error", "User Profile not Found");
                res.redirect("/");
            }else{
                if(foundProfile.owner.id.equals(req.user._id)){
                    next();
                }else{
                    req.flash("error", "Permission Denied");
                    res.redirect("/blogs");
                }
            }
        });
    }else{
        req.flash("error", "You need to be Logged In to do that");
        res.redirect("/blogs");
    }
}

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "Permission Denied");
    res.redirect("/blogs");
}

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("SERVER STARTED");
});