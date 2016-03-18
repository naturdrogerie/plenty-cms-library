module.exports = function( grunt )
{

    grunt.initConfig( {
        pkg: grunt.file.readJSON( 'package.json' ),

        clean: {
            debug: ['debug'],
            doc  : ['doc'],
            build: ['dist']
        },

        karma: {
            unit: {
                configFile: 'test/karma.conf.js',
                // Start these browsers, currently available:
                // - Chrome
                // - ChromeCanary
                // - Firefox
                // - Opera
                // - Safari (only Mac)
                // - PhantomJS
                // - IE (only Windows)
                // CLI --browsers Chrome,Firefox,Safari
                browsers  : ['PhantomJS'],
                verbose   : true,
                logLevel  : 'WARN'
            }
        },

        htmlConvert: {
            options  : {
                base  : 'src/partials/',
                module: 'TemplateCache'
            },
            templates: {
                src : ['src/partials/**/*.html'],
                dest: 'tmp/templates.js'
            }
        },

        concat: {
            options: {
                sourceMap: true
            },
            debug  : {
                src : ['libs/mustache.min.js', 'src/helpers/*.js', 'tmp/templates.js', 'tmp/plentyFramework.js', 'src/partials/**/*.js', 'src/factories/*.js', 'src/services/*.js', 'src/directives/*.js', 'src/plentyFrameworkCompiler.js'],
                dest: 'debug/<%= pkg.name %>-<%= pkg.version %>.js'
            }
        },

        uglify: {
            compress: {
                "pure_funcs": ['console.log'],
                unused      : true,
                "join_vars" : true
            },
            options : {
                sourceMap              : true,
                sourceMapIncludeSources: true,
                sourceMapIn            : 'debug/<%= pkg.name %>-<%= pkg.version %>.js.map',
                banner                 : '/**\n * Licensed under AGPL v3\n * (https://github.com/plentymarkets/plenty-cms-library/blob/master/LICENSE)\n * =====================================================================================\n * @copyright   Copyright (c) 2015, plentymarkets GmbH (http://www.plentymarkets.com)\n * Changes made by Die Naturdrogerie (https://www.naturdrogerie.de)\n * @author      Felix Dausch <felix.dausch@plentymarkets.com>\n * @author      Uwe Schürmann <uwe@naturdrogerie.de>\n * =====================================================================================\n*/'
            },
            build   : {
                src : 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
                dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.min.js'
            }
        },

        yuidoc: {
            doc: {
                options: {
                    paths : 'src/',
                    outdir: 'doc/'
                }
            }
        },

        copy: {
            debug: {
                expand: true,
                src   : 'lang/*',
                dest  : 'debug/'
            },
            build: {
                expand: true,
                cwd   : 'debug/',
                src   : '**',
                dest  : 'dist/'
            }
        },

        'string-replace': {
            debug: {
                files: {
                    'tmp/plentyFramework.js' : 'src/plentyFramework.js'
                },
                options: {
                    replacements: [{
                        pattern: /var version = "([\d]+\.[\d]+\.[\d])";/g,
                        replacement: 'var version = "<%= pkg.version %>";'
                    }]
                }
            }
        }
    } );

    grunt.loadNpmTasks( 'grunt-contrib-clean' );
    grunt.loadNpmTasks( 'grunt-contrib-concat' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-yuidoc' );
    grunt.loadNpmTasks( 'grunt-contrib-copy' );
    grunt.loadNpmTasks( 'grunt-string-replace' );
    grunt.loadNpmTasks( 'grunt-karma' );
    grunt.loadNpmTasks( 'grunt-html-convert' );

    grunt.registerTask( 'debug', ['clean:debug', 'copy:debug', 'htmlConvert', 'string-replace', 'concat:debug'] );
    grunt.registerTask( 'doc', ['clean:doc', 'yuidoc:doc'] );
    grunt.registerTask( 'build', ['debug', 'doc', 'karma', 'clean:build', 'copy:build', 'uglify:build'] );
    grunt.registerTask( 'build-skip-tests', ['debug', 'doc', 'clean:build', 'copy:build', 'uglify:build'] );
    grunt.registerTask( 'default', ['debug'] );

};
