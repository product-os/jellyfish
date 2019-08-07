import ava from 'ava';
import { downloadFile, selectFiles, truncateFileName } from './file';

ava('Should truncate file name', t => {
	t.is(truncateFileName('longnamelongnamelongname.txt'), 'longnamelo[...].txt');
	t.is(truncateFileName('longnamelongnamelongname'), 'longnamelo[...]');
	t.is(truncateFileName('exactlyten.md'), 'exactlyten.md');
	t.is(truncateFileName('exactlyten'), 'exactlyten');
	t.is(truncateFileName('shorttext.txt'), 'shorttext.txt');
	t.is(truncateFileName('shorttext'), 'shorttext');
});

ava.failing('Should select files', () => {
	selectFiles();
});

ava.failing('Should download a file', () => {
	downloadFile(new File(['foo'], 'bar.txt'), 'baz.txt');
});
