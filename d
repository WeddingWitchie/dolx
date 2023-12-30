warning: LF will be replaced by CRLF in Degrees of Lewdity VERSION.html.
The file will have its original line endings in your working directory
[1mdiff --git a/Degrees of Lewdity VERSION.html b/Degrees of Lewdity VERSION.html[m
[1mindex 4e5d01115..155bd2629 100644[m
[1m--- a/Degrees of Lewdity VERSION.html[m	
[1m+++ b/Degrees of Lewdity VERSION.html[m	
[36m@@ -471537,6 +471537,12 @@[m [mYou can feel Whitney getting close to cumming, &lt;&lt;his&gt;&gt; &lt;&lt;if _w[m
 			You enter the maths classroom.[m
 			&lt;&lt;npc River&gt;&gt;&lt;&lt;person1&gt;&gt;[m
 			River is preparing at the front of the room while the seats fill.[m
[32m+[m			[32m&lt;&lt;if $xchangewhitneyreaction is 1 and $xchangewhitneypunishment is undefined and playerIsXChanged() and $forcedcrossdressingdisable is &quot;f&quot; and $player.gender_appearance is &quot;f&quot;&gt;&gt;[m
[32m+[m				[32m&lt;span class=&quot;purple&quot;&gt;Whitney&#39;s gaze is fixated on you as you sit down in your usual seat.&lt;/span&gt;[m
[32m+[m				[32m&lt;br&gt;&lt;br&gt;[m
[32m+[m				[32m&lt;span class=&quot;red&quot;&gt;&lt;i&gt;Whitney now knows you lied about your identity.&lt;/i&gt;&lt;/span&gt;[m
[32m+[m				[32m&lt;&lt;set $xchangewhitneypunishment to 0&gt;&gt;[m
[32m+[m			[32m&lt;&lt;/if&gt;&gt;[m
 			&lt;&lt;if $worn.over_upper.name isnot &quot;naked&quot; or $worn.over_lower.name isnot &quot;naked&quot; or $worn.over_head.name isnot &quot;naked&quot;&gt;&gt;[m
 				&lt;&lt;undressOverClothes &quot;mathsClassroom&quot;&gt;&gt;[m
 				You hang your coat at the back of the class and take your seat.[m
[36m@@ -488415,6 +488421,9 @@[m [mYou find a small pin in the locker, and use the tip to poke a tiny hole in the c[m
 &lt;&lt;if ![&quot;early&quot;, &quot;late&quot;, &quot;earlynoschool&quot;, &quot;latenoschool&quot;, &quot;daynoschool&quot;].includes($schoolstate)&gt;&gt;[m
 	&lt;&lt;if $schoolstate is &quot;morning&quot;&gt;&gt;[m
 		You are in the courtyard in front of the school. Many students have already gathered and started socialising, despite school not officially beginning yet.[m
[32m+[m		[32m&lt;&lt;if $xchangewhitneyreaction is undefined and playerIsXChanged() and $forcedcrossdressingdisable is &quot;f&quot; and $player.gender_appearance is &quot;f&quot;&gt;&gt;[m
[32m+[m			[32m&lt;span class=&quot;purple&quot;&gt;You see Whitney hanging out by the school entrance.&lt;/span&gt;[m
[32m+[m		[32m&lt;&lt;/if&gt;&gt;[m
 		&lt;br&gt;&lt;br&gt;[m
 	&lt;&lt;elseif $schoolstate is &quot;afternoon&quot;&gt;&gt;[m
 		You are in the courtyard in front of the school. Some students are running around and playing, as the facilities stay open for a couple of hours.[m
[36m@@ -488426,7 +488435,7 @@[m [mYou find a small pin in the locker, and use the tip to poke a tiny hole in the c[m
 			You hear some loud protests and arrive just in time to see &lt;span class=&quot;gold&quot;&gt;Leighton being led away by police.&lt;/span&gt;&lt;&lt;imprison_leighton&gt;&gt;[m
 		&lt;&lt;elseif $detention gte 1 and $daily.school.detentionAttended isnot 1 and $headnodetention isnot 1 and $pillory_tenant.special.name isnot &quot;Leighton&quot;&gt;&gt;[m
 			&lt;span class=&quot;purple&quot;&gt;You see the head guarding the gate.&lt;/span&gt; You&#39;re meant to be in detention, so if you leave that way, you&#39;ll be apprehended.[m
[31m-		&lt;&lt;elseif $bullytimer gte 1 and $bullytimeroutside gte 1 and $daily.whitney.bullyGate isnot 1 and C.npc.Whitney.init is 1 and ![&quot;dungeon&quot;, &quot;pillory&quot;].includes(C.npc.Whitney.state)&gt;&gt;[m
[32m+[m		[32m&lt;&lt;elseif C.npc.Whitney.init is 1 and ![&quot;dungeon&quot;, &quot;pillory&quot;].includes(C.npc.Whitney.state) and (($xchangewhitneyreaction is 1 and $xchangewhitneypunishment is 0) or ($bullytimer gte 1 and $bullytimeroutside gte 1 and $daily.whitney.bullyGate isnot 1))&gt;&gt;[m
 			&lt;span class=&quot;purple&quot;&gt;You see Whitney hanging out by the gate.&lt;/span&gt;[m
 		&lt;&lt;/if&gt;&gt;[m
 		&lt;br&gt;&lt;br&gt;[m
[36m@@ -488477,14 +488486,18 @@[m [mYou find a small pin in the locker, and use the tip to poke a tiny hole in the c[m
 		&lt;&lt;sneakicon&gt;&gt;&lt;&lt;link [[Sneak behind the school (0:05)|School Rear Courtyard]]&gt;&gt;&lt;&lt;pass 5&gt;&gt;&lt;&lt;/link&gt;&gt;[m
 		&lt;br&gt;[m
 	&lt;&lt;else&gt;&gt;[m
[31m-		&lt;&lt;entranceicon&gt;&gt;&lt;&lt;link [[Enter the school (0:01)|Hallways]]&gt;&gt;&lt;&lt;pass 1&gt;&gt;&lt;&lt;/link&gt;&gt;[m
[32m+[m		[32m&lt;&lt;if $schoolstate is &quot;morning&quot; and $xchangewhitneyreaction is undefined and playerIsXChanged() and $forcedcrossdressingdisable is &quot;f&quot; and $player.gender_appearance is &quot;f&quot;&gt;&gt;[m
[32m+[m			[32m&lt;&lt;entranceicon&gt;&gt;&lt;&lt;link [[Enter the school (0:01)|Bully XChange Reaction]]&gt;&gt;&lt;&lt;pass 1&gt;&gt;&lt;&lt;/link&gt;&gt;[m
[32m+[m		[32m&lt;&lt;else&gt;&gt;[m
[32m+[m			[32m&lt;&lt;entranceicon&gt;&gt;&lt;&lt;link [[Enter the school (0:01)|Hallways]]&gt;&gt;&lt;&lt;pass 1&gt;&gt;&lt;&lt;/link&gt;&gt;[m
[32m+[m		[32m&lt;&lt;/if&gt;&gt;[m
 		&lt;br&gt;[m
 		&lt;&lt;schoolicon &quot;courtyard&quot;&gt;&gt;&lt;&lt;link [[Rear courtyard (0:02)|School Rear Courtyard]]&gt;&gt;&lt;&lt;pass 2&gt;&gt;&lt;&lt;/link&gt;&gt;[m
 		&lt;br&gt;&lt;br&gt;[m
 		&lt;&lt;if $schoolstate is &quot;afternoon&quot; and $detention gte 1 and $daily.school.detentionAttended isnot 1 and $headnodetention isnot 1 and $pillory_tenant.special.name isnot &quot;Leighton&quot;&gt;&gt;[m
 			&lt;&lt;oxfordicon&gt;&gt;&lt;&lt;link [[Leave the school|School Leave Stop]]&gt;&gt;&lt;&lt;schoolclothesreset&gt;&gt;&lt;&lt;/link&gt;&gt;[m
 			&lt;br&gt;[m
[31m-		&lt;&lt;elseif $schoolstate is &quot;afternoon&quot; and $bullytimer gte 1 and $bullytimeroutside gte 1 and $daily.whitney.bullyGate isnot 1 and C.npc.Whitney.init is 1 and ![&quot;dungeon&quot;, &quot;pillory&quot;].includes(C.npc.Whitney.state)&gt;&gt;[m
[32m+[m		[32m&lt;&lt;elseif $schoolstate is &quot;afternoon&quot; and C.npc.Whitney.init is 1 and ![&quot;dungeon&quot;, &quot;pillory&quot;].includes(C.npc.Whitney.state) and (($xchangewhitneyreaction is 1 and $xchangewhitneypunishment is 0) or ($bullytimer gte 1 and $bullytimeroutside gte 1 and $daily.whitney.bullyGate isnot 1))&gt;&gt;[m
 			&lt;&lt;oxfordicon&gt;&gt;&lt;&lt;link [[Leave the school|School Leave Whitney]]&gt;&gt;&lt;&lt;schoolclothesreset&gt;&gt;&lt;&lt;/link&gt;&gt;[m
 			&lt;br&gt;[m
 		&lt;&lt;elseif Time.schoolDay and Time.hour gte 7 and Time.hour lte 16&gt;&gt;[m
[36m@@ -595101,6 +595114,10 @@[m [mThe crew make sure you&#39;re okay, then head back to their ship.[m
 &lt;&lt;link [[Next|Mer Street]]&gt;&gt;&lt;&lt;set $eventskip to 1&gt;&gt;&lt;&lt;/link&gt;&gt;[m
 &lt;br&gt;</tw-passagedata><tw-passagedata pid="10300" name="School Leave Whitney" tags="" position="1225,128725" size="100,100">&lt;&lt;set $outside to 1&gt;&gt;&lt;&lt;set $location to &quot;school&quot;&gt;&gt;&lt;&lt;set $daily.whitney.bullyGate to 1&gt;&gt;&lt;&lt;schooleffects&gt;&gt;&lt;&lt;effects&gt;&gt;[m
 [m
[32m+[m[32m&lt;&lt;if $xchangewhitneypunishment is 0&gt;&gt;[m
[32m+[m	[32m&lt;&lt;set $xchangewhitneypunishment to 1&gt;&gt;[m
[32m+[m[32m&lt;&lt;/if&gt;&gt;[m
[32m+[m
 &lt;&lt;if $whitneyReunionScene isnot undefined&gt;&gt;[m
 	&lt;&lt;npc Whitney&gt;&gt;&lt;&lt;person1&gt;&gt;[m
 	&lt;&lt;unset $whitneyReunionScene&gt;&gt;[m
[36m@@ -595410,7 +595427,115 @@[m [mYou hand Whitney the money. &quot;Nice doing business,&quot; &lt;&lt;he&gt;&gt;[m
 &lt;&lt;/if&gt;&gt;[m
 &lt;br&gt;&lt;br&gt;[m
 [m
[31m-&lt;&lt;link [[Next|Hallways]]&gt;&gt;&lt;&lt;endevent&gt;&gt;&lt;&lt;set $eventskip to 1&gt;&gt;&lt;&lt;/link&gt;&gt;</tw-passagedata><tw-passagedata pid="10308" name="Bully Strip 2" tags="" position="975,128850" size="100,100">&lt;&lt;effects&gt;&gt;[m
[32m+[m[32m&lt;&lt;link [[Next|Hallways]]&gt;&gt;&lt;&lt;endevent&gt;&gt;&lt;&lt;set $eventskip to 1&gt;&gt;&lt;&lt;/link&gt;&gt;</tw-passagedata><tw-passagedata pid="10308" name="Bully XChange Reaction" tags="" position="975,128850" size="100,100">&lt;