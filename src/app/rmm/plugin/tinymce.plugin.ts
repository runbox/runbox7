// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
// 
// This file is part of Runbox 7.
// 
// Runbox 7 is free software: You can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
// 
// Runbox 7 is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

declare const tinymce: any;

export class TinyMCEPlugin {
    constructor(
    ) {
    }
    create(options) {
        tinymce.overrideDefaults({
            base_url: options.base_url,  // Base for assets such as skins, themes and plugins
            suffix: (options.suffix || '.min') // This will make Tiny load minified versions of all its assets
        });
        setTimeout(() =>
            // Need to initialize in a timeout for the editor element to be available
            tinymce.init({
                selector: options.selector, // '#' + this.editorRef.nativeElement.id,
                browser_spellcheck: true,
                plugins: (options.plugins || 'print preview searchreplace autolink directionality ' +
                    'visualblocks visualchars fullscreen image link template codesample ' +
                    'table charmap hr pagebreak ' +
                    'nonbreaking anchor toc insertdatetime advlist lists wordcount imagetools ' +
                    'textpattern help code'),
                toolbar: (options.toolbar || 'formatselect | bold italic strikethrough forecolor backcolor codesample | ' +
                        'link image | alignleft aligncenter alignright alignjustify  | ' +
                        'numlist bullist outdent indent | removeformat | addcomment | code'),
                codesample_languages: (options.codesample_languages || [
                            {text: 'HTML/XML', value: 'markup'},
                            {text: 'JavaScript', value: 'javascript'},
                            {text: 'CSS', value: 'css'},
                            {text: 'PHP', value: 'php'},
                            {text: 'Ruby', value: 'ruby'},
                            {text: 'Python', value: 'python'},
                            {text: 'Java', value: 'java'},
                            {text: 'C', value: 'c'},
                            {text: 'C#', value: 'csharp'},
                            {text: 'C++', value: 'cpp'}
                        ]),
                contextmenu: false,
                image_list: (options.image_list || []),
                menubar: (options.menubar || false),
                setup: (options.setup),
                init_instance_callback: (options.init_instance_callback)
            }), 0 );
    }
    remove(editor) {
        tinymce.remove(editor);
    }
}
