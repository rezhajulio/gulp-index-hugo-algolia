/*jshint esversion: 6 */
import gulp from 'gulp';
import babel from 'gulp-babel';
import through from 'through2';
import path from 'path';
import gutil from 'gulp-util';
import {
    File,
    PluginError
} from 'gulp-util';
import algoliasearch from 'algoliasearch';
import * as dotenv from 'dotenv';
import matter from 'gray-matter';

dotenv.load();

const PATH = {
    content: "content/**/*.md",
    index: "dist/index.json"
};

function getAliases(datum, file) {
    // Hugo use slug as url
    // if not available, will use filename as url
    if (datum.data.slug === undefined) {
        return path.basename(file.path, '.md');
    }

    return datum.data.slug;
}

gulp.task('index', () => {
    console.log("Starting to index rezhajulio.id ...");

    let index = [];
    gulp.src(PATH.content)
        .pipe(through.obj(function (file, enc, cb) {
            this.push(file);
            let datum = matter(file.contents.toString(), {
                lang: 'toml',
                delims: ['+++', '+++']
            });

            if (datum.data.draft !== true) {
                index.push({
                    content: datum.content,
                    uri: getAliases(datum, file),
                    title: datum.data.title,
                    image: datum.data.image,
                    date: datum.data.date,
                    objectID: path.basename(file.path)
                });
            }

            cb();
        }, function endStream(cb) {
            let indexFile = new File({
                base: path.join(__dirname, './dist/'),
                cwd: __dirname,
                path: path.join(__dirname, PATH.index)
            });

            indexFile.contents = new Buffer(JSON.stringify(index));

            let client = algoliasearch(process.env.ALGOLIA_API_KEY, process.env.ALGOLIA_API_SECRET);
            let db = client.initIndex('rezhajulio.web.id');

            console.log("indexing to algolia...");
            db.saveObjects(index, (err, content) => {
                if (err) {
                    console.log(err);
                }
                cb();
            });

            this.push(indexFile);
        }))
        .pipe(gulp.dest('dist'));
});
