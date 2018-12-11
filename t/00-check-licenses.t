use 5.022;
use strict;
use warnings;

use File::Find::Rule;
use List::MoreUtils 'any';
use Path::Tiny;
use Test::More;

sub has_license {
    my $path = shift;

    return $path->slurp =~ /Copyright \(C\) 2016-2... Runbox Solutions AS \(runbox\.com\)/;
}

my @excluded_files = qw(
    src/test.ts
    src/polyfills.ts
    src/typings.d.ts
);

my @files = File::Find::Rule->file()->name('*.ts')->in('src');
for my $file (@files) {
    next if any { /$file/ } @excluded_files; 
    ok has_license(path($file)), "$file has the correct license";
}

done_testing;
