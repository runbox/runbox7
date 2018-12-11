use 5.014;
use strict;
use warnings;

use File::Find;
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

find({ no_chdir => 1, wanted => sub {
    my $file = $File::Find::name;
    return unless $file =~ /\.ts$/;
    return if any { /$file/ } @excluded_files; 
    ok has_license(path($file)), "$file has the correct license";
} }, 'src');

done_testing;
