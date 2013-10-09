browserify = ./node_modules/browserify/bin/cmd.js
uglify = ./node_modules/uglify-js/bin/uglifyjs

gen = public/gen

$(gen)/renderer.js:
	$(browserify) -r ./renderer/index.js > $(gen)/renderer.js

minify: $(gen)/renderer.js
	$(foreach file, $?, $(uglify) $(file) --screw-ie8 -m -c -o $(file))

clean:
	rm -rf $(gen)/*.js
