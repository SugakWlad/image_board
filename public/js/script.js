(function() {
    Handlebars.templates = Handlebars.templates || {};

    var templates = document.querySelectorAll('template');
 
    Array.prototype.slice.call(templates).forEach(function(tmpl) {
        Handlebars.templates[tmpl.id] = Handlebars.compile(tmpl.innerHTML.replace(/{{&gt;/g, '{{>'));
    });
 
    Handlebars.partials = Handlebars.templates;
    var timer;
    var model;
 
    var Router = Backbone.Router.extend({
         routes: {
             'home': 'home',
             'image/:id': 'image',
             'upload': 'upload'
         },
         home: function() {
            $('#homecontainer').off();
             var boardView = new BoardView({
                 el: '#homecontainer',
                 model: new BoardModel
             });
         },
         image: function(id) {
            $('#singlepagecont').off();
            var imageView = new ImageView({
                el: '#singlepagecont',
                model: new ImageModel({id: id})
            });
         },
         upload: function(){
            $('#uploadcont').off();
            var uploadView = new UploadView({
                el: '#uploadcont',
                model: new UploadModel
            })
         }
    });

    var BoardView = Backbone.View.extend({
        initialize: function() {
            var view = this;
            this.model.on('change', function downloadImages() {
                view.render();
                view.off('change', downloadImages);
            });
            this.model.on('newImages', function(data){
                view.addImages(data);
            })
        },
        render: function() {
            var data = this.model.toJSON();
            var html = Handlebars.templates.home(data);
            this.$el.html(html);
            var view = this;
            $('#more').css({display: 'block'})
            $('.images').on('mouseenter', function(e){
                $(e.target).next().children().css({display: 'inline-block'});
            });
            $('.homeimageinfo').on('mouseleave', function(e){
                 $('.homeimageinfo').css({display: 'none'});
            });
            $('#more').on('click', function(e){
                $('#more').css({display: 'none'});
                view.model.more(view.model.attributes.images[5].id);
            })
        },
        addImages: function(data){
            var view = this;
            var html = Handlebars.templates.home(data);
            this.$el.append(html);
            $('.images').on('mouseenter', function(e){
                $(e.target).next().children().css({display: 'inline-block'});
            });
            $('.homeimageinfo').on('mouseleave', function(e){
                 $('.homeimageinfo').css({display: 'none'});
            });
            model = view.model;
            timer = setTimeout(autoScroll, 500);
        },
        events: {
            
        }
    });

    var UploadView = Backbone.View.extend({
        initialize: function(){
            this.render();
            this.model.on('uploadSuccess', function(){
                html = '';
                $('#uploadcont').html(html);
                $('#uploadcont').css({display: 'none'});
                router.navigate('/home');
            })
        },
        render: function(){
            var place = $(document).scrollTop() + 240 + 'px';
            $('#uploadcont').css({top: place});
            $('body').css({overflow: 'hidden'});
            $('#uploadcont').css({display: 'flex'})
            this.$el.html(Handlebars.templates.upload());
            $('#shadow').css({opacity: 0.7});   
            $('#shadow').css({left: 0});
            $('#shadow').on('click', function(){
                $('body').css({overflow: 'visible'});
                $('#uploadcont').css({display: 'none'});
                $('#shadow').css({opacity: 0}); 
                setTimeout(function(){
                    $('#shadow').css({left: '-100%'});
                }, 600);
                html = '';
                $('#uploadcont').html(html);
                router.navigate('/home');
            })
        },
        events: {
            'click button': function(){
                this.model.set({
                    username: this.$el.find('input[name=username]').val(),
                    title: this.$el.find('input[name=title]').val(),
                    description: this.$el.find('input[name=description]').val(),
                    file: this.$el.find('input[type="file"]').prop('files')[0]
                }).save();
            }
        }
    })

    var ImageView = Backbone.View.extend({
        initialize: function() {
            var view = this;
            this.model.on('change', function ImageInitialize() {
                view.render(view.model.id);
                view.model.off('change', ImageInitialize);
            });
        },
        render: function(id) {
            var view = this;
            var place = $(document).scrollTop() + 80 + 'px';
            $('#singlepagecont').css({top: place});
            var data = this.model.toJSON();
            var html = Handlebars.templates.image(data.images[0]);
            if(document.documentElement.clientWidth > 700){
                this.$el.html(html);
                $('#shadow').css({opacity: 0.7});   
                $('#shadow').css({left: 0});
                $('body').css({overflow: 'hidden'});
            }else{
                $('#more').css({display: 'none'});
                $('#homecontainer').html(html);
            }
            $('#commentscontainer').off();
            var commentView = new CommentView({
                el: '#commentscontainer',
                model: new CommentModel({image_id: id})
            });
            $('#shadow').on('click', function(){
                $('body').css({overflow: 'visible'});
                $('#shadow').css({opacity: 0}); 
                setTimeout(function(){
                    $('#shadow').css({left: '-100%'});
                }, 600);
                html = '';
                $('#singlepagecont').html(html);
                router.navigate('/home');
            })
        },
        events: {
            'click #addlike': function(e){
                var view = this;
                view.model.checkLike().then(function(result){
                    if(result.like){
                        var text = $(e.target).html();
                        text = Number(text) - 1;
                        $(e.target).html(text);
                        view.model.removelike();
                    }
                    if(!result.like){
                        var text = $(e.target).html();
                        text = Number(text) + 1;
                        $(e.target).html(text);
                        view.model.addlike();
                    }
                })
            }
        }
    });

    var CommentView = Backbone.View.extend({
        initialize: function() {
            var view = this;
            this.model.on('change', function getComments() {
                view.render();
                view.model.off('change', getComments);
            });
            this.model.on('newComment', function(data){
                view.addComment(data);
            })
        },
        render: function() {
            var view = this;
            var data = this.model.toJSON();
            var html = Handlebars.templates.comments(data);
            this.$el.html(html);
            $('#addcommentbtn').on('click', function(e){
                var commentObj = {
                    username: $('#username_comment').val(),
                    comment: $('#comment-comment').val()
                };
                if(commentObj.username !== '' && commentObj.comment !==''){
                    view.model.set(commentObj).save();

                }else{
                    console.log('empty');
                }
            })
        },
        addComment: function(newComment){
            var html = Handlebars.templates.newcomment(newComment);
            $('#commentslist').prepend(html);
            $('.color-comment').css('backgroundColor');
            $('.color-comment').css('backgroundColor', 'rgb(252, 252, 252)');
            setTimeout(function(){
                $('.color-comment').removeClass('color-comment');
                $('.color-comment').css('backgroundColor', 'rgb(255, 223, 163)');
            }, 1000);
        },
        events: {
            
        }
    });


    //***********************MODELS****************************



    var BoardModel = Backbone.Model.extend({
        initialize: function() {
            this.fetch();
        },
        url: '/images',
        more: function(id){
            var data = {id: id};
            model = this;
            $.ajax({
                url: '/images/more/' + id,
                method: 'GET',
                success: function(data){
                    model.attributes.images = data.images;
                    model.trigger('newImages', data);
                }
            })
        }
    });

    var UploadModel = Backbone.Model.extend({
        url: '/upload',
        save: function(){
            var formData = new FormData;
            formData.append('file', this.get('file'));
            formData.append('username', this.get('username'));
            formData.append('title', this.get('title'));
            formData.append('description', this.get('description'));
            var model = this;
            $.ajax({
                url: model.url,
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function() {
                    model.trigger('uploadSuccess');
                    location.href = '#images';
                }
            })
        }
    })

    var ImageModel = Backbone.Model.extend({
        initialize: function() {
            this.url =  '/image/' + this.id;
            this.fetch();
        },
        checkLike: function(){
            var model = this;
            return $.ajax({
                url: '/checklike/' + model.attributes.id,
                method: 'GET',
                success: function(data){
                    return data.like;
                }
            })
        },
        addlike: function(){
            $.ajax({
                url: '/addlike/' + this.id,
                method: 'POST'
            })
        },
        removelike: function(){
            $.ajax({
                url: '/removelike/' + this.id,
                method: 'POST'
            })
        }
    });

    var CommentModel = Backbone.Model.extend({
        initialize: function() {
            this.url =  '/comments/' + this.attributes.image_id;
            this.fetch();
        },
        save: function(){
            var commentInfo = {
                image_id: this.get('image_id'),
                username: this.get('username'),
                comment: this.get('comment')
            };
            var model = this;
            $.ajax({
                url: '/addcomment',
                method: 'POST',
                data: commentInfo,
                success: function(data){
                    model.trigger('newComment', data);
                }
            })
        }
    });

    var router = new Router();
 
    Backbone.history.start();

    function autoScroll(){
    if($(document).scrollTop() + $(window).height() == $(document).height()){
        if(model.attributes.images[5]){
            model.more(model.attributes.images[5].id);
        }
    }else{
        clearTimeout(timer);
            timer = setTimeout(autoScroll, 500);
        }
    }

})();

