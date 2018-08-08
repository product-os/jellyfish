# Rethinkdb binary storage performance

100 simple documents with this shape are created. The id's are in ascending
order from 0 - 99, and the sibling attribute is in ascending order from 1 - 100.

```
{
  id: number,
  data: {
    sibling: number,
    file: null,
  }
}
```

100 filter queries are run on the sibling attribute, where the query value is incremented from 1 - 100.
The results are:

```
Min: 3.9235239999998157
Max: 8.127557000000252
Avg: 4.432113750000003
```

If the same test is run but the `file` field is given a 1mb file buffer instead
of a null value, the results are:

```
Min: 49.77837599999839
Max: 122.61470000000008
Avg: 58.000575199999794
```

## What if the documents containing files are a fraction of the total documents?

The same experiment is run, but this time 1000 documents are created. When files
are added, only 100 documents out of the 1000 will contain file buffers.

When running queries on 1000 documents where none of them contained files the results are:

```
Min: 4.845369999999093
Max: 9.285815999999613
Avg: 5.493467091000017
```

When running queries on 1000 documents where 100 of them contained files the results are:

```
Min: 22.340409999997064
Max: 122.81703299999936
Avg: 29.489819803000113
```

If we stretch this further and create 10,000 documents where only 1% contain a
file, the results are:

```
Min: 35.878506000037305
Max: 126.81585700000869
Avg: 41.99186075419925
```

## Observations

When querying datasets that contain files, the first query run is usually about
twice as slow as the rest of the queries. After that the query time remains fairly stable.

